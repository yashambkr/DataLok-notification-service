import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from '../notifications.service';
import { Socket } from 'socket.io';
import { Notification } from '../entities/notification.entity';

describe('NotificationGateway', () => {
    let gateway: NotificationGateway;
    let notificationsService: jest.Mocked<NotificationsService>;
    let jwtService: jest.Mocked<JwtService>;
    let configService: jest.Mocked<ConfigService>;

    const mockSocket = {
        id: 'test-socket-id',
        handshake: {
            auth: {},
            query: {},
        },
        data: {},
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
    } as unknown as Socket;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationGateway,
                {
                    provide: NotificationsService,
                    useValue: {
                        getNotifications: jest.fn(),
                        getUnreadCount: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
            ],
        }).compile();

        gateway = module.get<NotificationGateway>(NotificationGateway);
        notificationsService = module.get(NotificationsService);
        jwtService = module.get(JwtService);
        configService = module.get(ConfigService);

        // Reset mocks
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleConnection', () => {
        it('should authenticate and join user to room with valid token from auth', async () => {
            const token = 'valid-token';
            const userId = 'user-123';

            mockSocket.handshake.auth = { token };
            jwtService.verifyAsync.mockResolvedValue({ sub: userId });

            await gateway.handleConnection(mockSocket);

            expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
                secret: 'test-secret',
            });
            expect(mockSocket.data.userId).toBe(userId);
            expect(mockSocket.join).toHaveBeenCalledWith(`user:${userId}`);
            expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
                userId,
            });
        });

        it('should authenticate with token from query parameter', async () => {
            const token = 'valid-token';
            const userId = 'user-456';

            mockSocket.handshake.auth = {};
            mockSocket.handshake.query = { token };
            jwtService.verifyAsync.mockResolvedValue({ userId });

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.data.userId).toBe(userId);
            expect(mockSocket.join).toHaveBeenCalledWith(`user:${userId}`);
        });

        it('should disconnect client when no token provided', async () => {
            mockSocket.handshake.auth = {};
            mockSocket.handshake.query = {};

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect(mockSocket.join).not.toHaveBeenCalled();
        });

        it('should disconnect client when token is invalid', async () => {
            mockSocket.handshake.auth = { token: 'invalid-token' };
            jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect(mockSocket.join).not.toHaveBeenCalled();
        });

        it('should disconnect client when userId is missing from payload', async () => {
            mockSocket.handshake.auth = { token: 'valid-token' };
            jwtService.verifyAsync.mockResolvedValue({});

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect(mockSocket.join).not.toHaveBeenCalled();
        });
    });

    describe('handleGetNotifications', () => {
        it('should return notifications for authenticated user', async () => {
            const userId = 'user-123';
            mockSocket.data.userId = userId;

            const mockNotifications = [
                {
                    id: '1',
                    userId,
                    notificationType: 'EMPLOYEE_CREATION',
                    displayName: 'Employee Creation',
                    payload: {},
                    isRead: false,
                    createdAt: new Date(),
                    readAt: null,
                },
            ] as Notification[];

            notificationsService.getNotifications.mockResolvedValue([
                mockNotifications,
                1,
            ]);

            await gateway.handleGetNotifications(mockSocket, {
                page: 1,
                limit: 20,
            });

            expect(notificationsService.getNotifications).toHaveBeenCalledWith(
                userId,
                {
                    page: 1,
                    limit: 20,
                    isRead: undefined,
                    notificationType: undefined,
                },
            );
            expect(mockSocket.emit).toHaveBeenCalledWith('notifications', {
                data: mockNotifications,
                total: 1,
                page: 1,
                limit: 20,
            });
        });

        it('should emit error when user is not authenticated', async () => {
            mockSocket.data.userId = undefined;

            await gateway.handleGetNotifications(mockSocket, {});

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                message: 'Unauthorized',
            });
            expect(notificationsService.getNotifications).not.toHaveBeenCalled();
        });
    });

    describe('handleGetNotificationCount', () => {
        it('should return unread count for authenticated user', async () => {
            const userId = 'user-123';
            mockSocket.data.userId = userId;

            notificationsService.getUnreadCount.mockResolvedValue(5);

            await gateway.handleGetNotificationCount(mockSocket);

            expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
                userId,
            );
            expect(mockSocket.emit).toHaveBeenCalledWith('notificationCount', {
                count: 5,
            });
        });

        it('should emit error when user is not authenticated', async () => {
            mockSocket.data.userId = undefined;

            await gateway.handleGetNotificationCount(mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                message: 'Unauthorized',
            });
            expect(notificationsService.getUnreadCount).not.toHaveBeenCalled();
        });
    });

    describe('emitNewNotification', () => {
        it('should emit new notification to user room', () => {
            const userId = 'user-123';
            const notification = {
                id: '1',
                userId,
                notificationType: 'EMPLOYEE_CREATION',
                displayName: 'Employee Creation',
                payload: { name: 'John Doe' },
                isRead: false,
                createdAt: new Date(),
                readAt: null,
            } as Notification;

            gateway.server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any;

            gateway.emitNewNotification(userId, notification);

            expect(gateway.server.to).toHaveBeenCalledWith(`user:${userId}`);
            expect(gateway.server.to('').emit).toHaveBeenCalledWith(
                'newNotification',
                {
                    id: notification.id,
                    notificationType: notification.notificationType,
                    displayName: notification.displayName,
                    payload: notification.payload,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt,
                },
            );
        });
    });

    describe('emitNotificationRead', () => {
        it('should emit notification read event to user room', () => {
            const userId = 'user-123';
            const notificationId = 'notif-1';

            gateway.server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any;

            gateway.emitNotificationRead(userId, notificationId);

            expect(gateway.server.to).toHaveBeenCalledWith(`user:${userId}`);
            expect(gateway.server.to('').emit).toHaveBeenCalledWith(
                'notificationRead',
                { notificationId },
            );
        });
    });

    describe('emitUnreadCountUpdate', () => {
        it('should emit unread count update to user room', () => {
            const userId = 'user-123';
            const count = 10;

            gateway.server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any;

            gateway.emitUnreadCountUpdate(userId, count);

            expect(gateway.server.to).toHaveBeenCalledWith(`user:${userId}`);
            expect(gateway.server.to('').emit).toHaveBeenCalledWith(
                'unreadCountUpdate',
                { count },
            );
        });
    });
});

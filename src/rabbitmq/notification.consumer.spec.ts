import { Test, TestingModule } from '@nestjs/testing';
import { NotificationConsumer } from './notification.consumer';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationGateway } from '../notifications/gateways/notification.gateway';
import { RmqContext } from '@nestjs/microservices';
import { NotificationType } from '../notifications/enums/notification-type.enum';

describe('NotificationConsumer', () => {
    let consumer: NotificationConsumer;
    let notificationsService: jest.Mocked<NotificationsService>;
    let notificationGateway: jest.Mocked<NotificationGateway>;

    const mockNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user123',
        notificationType: NotificationType.EMPLOYEE_CREATION,
        displayName: 'Employee Creation',
        payload: { employeeName: 'John Doe' },
        isRead: false,
        createdAt: new Date(),
        readAt: null,
    };

    const mockChannel = {
        ack: jest.fn(),
        nack: jest.fn(),
    };

    const mockContext = {
        getChannelRef: jest.fn().mockReturnValue(mockChannel),
        getMessage: jest.fn().mockReturnValue({}),
    } as unknown as RmqContext;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationConsumer],
            providers: [
                {
                    provide: NotificationsService,
                    useValue: {
                        createNotification: jest.fn(),
                        getUnreadCount: jest.fn(),
                    },
                },
                {
                    provide: NotificationGateway,
                    useValue: {
                        emitNewNotification: jest.fn(),
                        emitUnreadCountUpdate: jest.fn(),
                    },
                },
            ],
        }).compile();

        consumer = module.get<NotificationConsumer>(NotificationConsumer);
        notificationsService = module.get(NotificationsService);
        notificationGateway = module.get(NotificationGateway);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(consumer).toBeDefined();
    });

    describe('handleNotificationEvent', () => {
        it('should process valid notification event successfully', async () => {
            const eventData = {
                userId: 'user123',
                notificationType: NotificationType.EMPLOYEE_CREATION,
                displayName: 'Employee Creation',
                payload: { employeeName: 'John Doe' },
            };

            notificationsService.createNotification.mockResolvedValue(
                mockNotification as any,
            );
            notificationsService.getUnreadCount.mockResolvedValue(5);

            await consumer.handleNotificationEvent(eventData, mockContext);

            expect(notificationsService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining(eventData),
            );
            expect(notificationGateway.emitNewNotification).toHaveBeenCalledWith(
                'user123',
                mockNotification,
            );
            expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
                'user123',
            );
            expect(notificationGateway.emitUnreadCountUpdate).toHaveBeenCalledWith(
                'user123',
                5,
            );
            expect(mockChannel.ack).toHaveBeenCalled();
        });

        it('should acknowledge invalid messages without processing', async () => {
            const invalidEventData = {
                // Missing required fields
                userId: 'user123',
            };

            await consumer.handleNotificationEvent(
                invalidEventData,
                mockContext,
            );

            expect(notificationsService.createNotification).not.toHaveBeenCalled();
            expect(notificationGateway.emitNewNotification).not.toHaveBeenCalled();
            expect(mockChannel.ack).toHaveBeenCalled();
        });

        it('should nack message on processing error', async () => {
            const eventData = {
                userId: 'user123',
                notificationType: NotificationType.EMPLOYEE_CREATION,
                displayName: 'Employee Creation',
                payload: { employeeName: 'John Doe' },
            };

            notificationsService.createNotification.mockRejectedValue(
                new Error('Database error'),
            );

            await consumer.handleNotificationEvent(eventData, mockContext);

            expect(mockChannel.nack).toHaveBeenCalledWith({}, false, true);
        });

        it('should handle missing payload gracefully', async () => {
            const eventData = {
                userId: 'user123',
                notificationType: NotificationType.EMPLOYEE_CREATION,
                displayName: 'Employee Creation',
                // Missing payload
            };

            await consumer.handleNotificationEvent(eventData, mockContext);

            expect(notificationsService.createNotification).not.toHaveBeenCalled();
            expect(mockChannel.ack).toHaveBeenCalled();
        });
    });
});

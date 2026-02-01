import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationEventDto } from './dto/notification-event.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { CustomLoggerService } from '../common/logger/logger.service';
import { OneSignalService } from './services/onesignal.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class NotificationsService {
    private readonly logger: CustomLoggerService;
    

    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        @Inject('RABBITMQ_SERVICE') private readonly rabbitMQClient: ClientProxy,
        private readonly oneSignalService: OneSignalService,
        loggerService: CustomLoggerService,
    ) {
        this.logger = loggerService;
        this.logger.setContext(NotificationsService.name);
    }

    /**
     * Create a new notification from an event
     */
    async createNotification(
        eventDto: NotificationEventDto,
        correlationId?: string,
    ): Promise<Notification> {
        try {
            this.logger.log(
                `Creating notification from event`,
                {
                    correlationId,
                    userId: eventDto.userId,
                    hasMessage: !!eventDto.message,
                    message: eventDto.message,
                    // displayName: eventDto.displayName,
                },
            );

            const notification = this.notificationRepository.create({
                user_id: eventDto.userId,
                type: eventDto.notificationType,
                title: eventDto.title,
                // displayName: eventDto.displayName,
                message: eventDto.message,
                is_read: false,
            });

            this.logger.log(
                `Saving notification to database`,
                { correlationId, notification },
            );

            const savedNotification = await this.notificationRepository.save(notification);

            this.logger.log(
                `Notification created and saved for user ${savedNotification.user_id}`,
                {
                    correlationId,
                    notificationId: savedNotification.id,
                    savedMessage: savedNotification.message,
                },
            );

            // Send push notification via OneSignal (non-blocking)
            // Use setImmediate to ensure it runs after the current event loop
            setImmediate(() => {
                this.sendPushNotification(savedNotification, correlationId);
            });

            return savedNotification;
        } catch (error) {
            this.logger.error(
                `Failed to create notification: ${error.message}`,
                error.stack,
                { correlationId, userId: eventDto.userId },
            );
            throw error;
        }
    }

    /**
     * Send push notification via OneSignal (async, non-blocking)
     */
    private async sendPushNotification(
        notification: Notification,
        correlationId?: string,
    ): Promise<void> {
        try {
            this.logger.log(
                `Attempting to send push notification via OneSignal`,
                {
                    correlationId,
                    notificationId: notification.id,
                    userId: notification.user_id,
                    notificationType: notification.type,
                },
            );

            // Send push notification asynchronously without blocking
            const success = await this.oneSignalService.sendNotificationToUser(
                notification.user_id,
                // notification.displayName,
                notification.title,
                notification.message,
                {
                    notificationId: notification.id,
                    notificationType: notification.type,
                    // ...notification.payload,
                },
                correlationId,
            );

            if (success) {
                this.logger.log(
                    `Push notification sent successfully`,
                    { correlationId, notificationId: notification.id },
                );
            } else {
                this.logger.warn(
                    `Push notification was not sent (OneSignal may be disabled or returned false)`,
                    { correlationId, notificationId: notification.id },
                );
            }
        } catch (error) {
            // Log error but don't throw - push notification failure shouldn't break notification creation
            this.logger.error(
                `Failed to send push notification: ${error.message}`,
                error.stack,
                { correlationId, notificationId: notification.id },
            );
        }
    }

    /**
     * Format notification message for push notification
     */
    // private formatNotificationMessage(notification: Notification): string {
    //     this.logger.log(`Formatting notification message`, {
    //         notificationId: notification.id,
    //         hasMessage: !!notification.message,
    //         message: notification.message,
    //     });

    //     // Use the message field from the notification if available
    //     if (notification.message) {
    //         return notification.message;
    //     }

    //     // Fallback to extracting from payload
    //     if (notification.payload && typeof notification.payload === 'object') {
    //         const payload = notification.payload as any;
    //         if (payload.message) return payload.message;
    //         if (payload.description) return payload.description;
    //         if (payload.text) return payload.text;
    //     }

    //     // Default message
    //     return ;
    // }

    /**
     * Get notifications for a user with pagination and filtering
     */
    async getNotifications(
        userId: string,
        query: GetNotificationsQueryDto,
        correlationId?: string,
    ): Promise<[Notification[], number]> {
        const { page = 1, limit = 20, isRead, notificationType } = query;

        const queryBuilder = this.notificationRepository
            .createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId });

        if (isRead !== undefined && isRead !== null) {
            queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
        }

        if (notificationType) {
            queryBuilder.andWhere(
                'notification.notificationType = :notificationType',
                { notificationType },
            );
        }

        // Order by isRead ASC (false/unread first), then by createdAt DESC (newest first)
        queryBuilder
            .orderBy('notification.isRead', 'ASC')
            .addOrderBy('notification.createdAt', 'DESC');

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [notifications, total] = await queryBuilder.getManyAndCount();

        return [notifications, total];
    }

    /**
     * Mark multiple notifications as read (bulk operation)
     * Used for auto-marking notifications after they are returned to the user
     */
    // async markNotificationsAsReadBulk(
    //     notificationIds: string[],
    //     correlationId?: string,
    // ): Promise<void> {
    //     if (notificationIds.length === 0) return;

    //     console.log(`[Service] markNotificationsAsReadBulk called with ${notificationIds.length} IDs`);

    //     try {
    //         const result = await this.notificationRepository.update(
    //             { id: In(notificationIds) },
    //             { is_read: true, re: new Date() }
    //         );

    //         console.log(`[Service] Update result:`, result);

    //         this.logger.log(
    //             `Bulk marked ${notificationIds.length} notifications as read`,
    //             { correlationId, notificationIds, affected: result.affected }
    //         );
    //     } catch (error) {
    //         console.error(`[Service] Error in markNotificationsAsReadBulk:`, error);
    //         this.logger.error(
    //             `Failed to bulk mark notifications as read: ${error.message}`,
    //             error.stack,
    //             { correlationId, notificationIds }
    //         );
    //     }
    // }

    /**
     * Get count of unread notifications for a user
     */
    async getUnreadCount(userId: string, correlationId?: string): Promise<number> {
        const count = await this.notificationRepository.count({
            where: {
                user_id:userId,
                is_read: false,
            },
        });

        return count;
    }

    /**
     * Mark a notification as read with ownership verification
     */
    async markAsRead(
        notificationId: string,
        userId: string,
        correlationId?: string,
    ): Promise<Notification> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.user_id !== userId) {
            throw new ForbiddenException(
                'You do not have permission to access this notification',
            );
        }

        notification.is_read = true;
        // notification.readAt = new Date();

        const updatedNotification = await this.notificationRepository.save(notification);

        return updatedNotification;
    }

    /**
     * Mark all unread notifications as read for a user
     */
    async markAllAsRead(userId: string, correlationId?: string): Promise<number> {
        const result = await this.notificationRepository.update(
            {
                user_id:userId,
                is_read: false,
            },
            {
                // isRead: true,
                // readAt: new Date(),
            },
        );

        const updatedCount = result.affected || 0;

        return updatedCount;
    }
}

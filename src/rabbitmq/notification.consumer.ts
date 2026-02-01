import { Controller } from '@nestjs/common';
import { EventPattern, Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventDto } from '../notifications/dto/notification-event.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CustomLoggerService } from '../common/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * RabbitMQ Consumer for notification events
 */
@Controller()
export class NotificationConsumer {
    private readonly logger: CustomLoggerService;

    constructor(
        private readonly notificationsService: NotificationsService,
        loggerService: CustomLoggerService,
    ) {
        this.logger = loggerService;
        this.logger.setContext(NotificationConsumer.name);
    }

    /**
     * Handle notification events from RabbitMQ
     */
    @EventPattern('notification.created')
    async handleNotificationEvent(
        @Payload() data: any,
        @Ctx() context: RmqContext,
    ) {
        console.log('[CONSUMER] ===== MESSAGE RECEIVED =====', new Date().toISOString());

        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        const startTime = Date.now();
        const correlationId = uuidv4();

        this.logger.log(`Processing notification event`, { correlationId, userId: data?.userId, data });

        try {
            // Validate incoming message
            const notificationEvent = plainToInstance(NotificationEventDto, data);
            this.logger.log(`Transformed notification event`, { correlationId, notificationEvent });
            const errors = await validate(notificationEvent);

            if (errors.length > 0) {
                const validationErrors = errors
                    .map((error) => Object.values(error.constraints || {}))
                    .flat();

                this.logger.error(
                    `Invalid notification event: ${validationErrors.join(', ')}`,
                    undefined,
                    { correlationId },
                );

                channel.ack(originalMsg);
                return;
            }

            // Create notification in database
            const notification = await this.notificationsService.createNotification(
                notificationEvent,
                correlationId,
            );

            const processingTime = Date.now() - startTime;

            // Acknowledge message after successful processing
            channel.ack(originalMsg);

            this.logger.log(
                `Notification processed successfully in ${processingTime}ms`,
                {
                    correlationId,
                    userId: notification.user_id,
                    notificationId: notification.id,
                    notificationType: notification.type,
                },
            );
        } catch (error) {
            const processingTime = Date.now() - startTime;

            this.logger.error(
                `Error processing notification: ${error.message}`,
                error.stack,
                { correlationId, processingTimeMs: processingTime },
            );

            // Negative acknowledgment with requeue
            channel.nack(originalMsg, false, true);
        }
    }
}

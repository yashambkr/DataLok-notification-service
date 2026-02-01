import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { OneSignalService } from './services/onesignal.service';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

/**
 * Notifications Module
 * Handles all notification-related functionality via REST API
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        forwardRef(() => RabbitMQModule),
    ],
    controllers: [],
    providers: [NotificationsService, OneSignalService],
    exports: [NotificationsService, OneSignalService],
})
export class NotificationsModule { }

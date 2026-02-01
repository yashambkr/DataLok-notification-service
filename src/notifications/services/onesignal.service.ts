import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OneSignal from 'onesignal-node';
import { CustomLoggerService } from '../../common/logger/logger.service';

/**
 * OneSignal Service for sending push notifications
 */
@Injectable()
export class OneSignalService {
    private client: OneSignal.Client | null = null;
    private readonly logger: CustomLoggerService;
    private readonly appId: string | undefined;
    private readonly enabled: boolean;

    constructor(
        private readonly configService: ConfigService,
        loggerService: CustomLoggerService,
    ) {
        this.logger = loggerService;
        this.logger.setContext(OneSignalService.name);

        this.appId = this.configService.get<string>('onesignal.appId');
        const restApiKey = this.configService.get<string>('onesignal.restApiKey');

        this.logger.log(`OneSignal initialization - App ID: ${this.appId ? 'present' : 'missing'}, API Key: ${restApiKey ? 'present' : 'missing'}`);

        // Check if OneSignal is configured
        this.enabled = !!(this.appId && restApiKey);

        if (this.enabled && this.appId && restApiKey) {
            try {
                this.client = new OneSignal.Client(this.appId, restApiKey);
                this.logger.log(`OneSignal client initialized successfully with App ID: ${this.appId.substring(0, 8)}...`);
            } catch (error) {
                this.logger.error('Failed to initialize OneSignal client', error.stack);
                this.enabled = false;
            }
        } else {
            this.logger.warn('OneSignal not configured. Push notifications will be disabled.');
        }
    }

    /**
     * Check if OneSignal is enabled and configured
     */
    isEnabled(): boolean {
        return this.enabled && this.client !== null;
    }

    /**
     * Send push notification to a user by external user ID
     */
    async sendNotificationToUser(
        userId: string,
        title: string,
        message: string,
        data?: Record<string, any>,
        correlationId?: string,
    ): Promise<boolean> {
        if (!this.isEnabled() || !this.client || !this.appId) {
            this.logger.warn('OneSignal not enabled, skipping push notification', {
                correlationId,
                userId,
            });
            return false;
        }

        try {
            const notification = {
                headings: { en: title },
                contents: { en: message },
                include_external_user_ids: [userId],
                data: data || {},
                app_id: this.appId,
            };

            this.logger.log('Sending push notification via OneSignal', {
                correlationId,
                userId,
                title,
            });

            const response = await this.client.createNotification(notification);

            if (response.body.errors) {
                this.logger.error(
                    'OneSignal API returned errors',
                    JSON.stringify(response.body.errors),
                    { correlationId, userId },
                );
                return false;
            }

            this.logger.log('Push notification sent successfully', {
                correlationId,
                userId,
                recipients: response.body.recipients,
            });

            return true;
        } catch (error) {
            this.logger.error(
                `Failed to send push notification: ${error.message}`,
                error.stack,
                { correlationId, userId },
            );
            return false;
        }
    }

    /**
     * Send push notification to multiple users by external user IDs
     */
    async sendNotificationToUsers(
        userIds: string[],
        title: string,
        message: string,
        data?: Record<string, any>,
        correlationId?: string,
    ): Promise<boolean> {
        if (!this.isEnabled() || !this.client || !this.appId) {
            this.logger.warn('OneSignal not enabled, skipping push notification', {
                correlationId,
                userCount: userIds.length,
            });
            return false;
        }

        try {
            const notification = {
                headings: { en: title },
                contents: { en: message },
                include_external_user_ids: userIds,
                data: data || {},
                app_id: this.appId,
            };

            this.logger.log('Sending push notification to multiple users via OneSignal', {
                correlationId,
                userCount: userIds.length,
                title,
            });

            const response = await this.client.createNotification(notification);

            if (response.body.errors) {
                this.logger.error(
                    'OneSignal API returned errors',
                    JSON.stringify(response.body.errors),
                    { correlationId, userCount: userIds.length },
                );
                return false;
            }

            this.logger.log('Push notification sent successfully to multiple users', {
                correlationId,
                userCount: userIds.length,
                recipients: response.body.recipients,
            });

            return true;
        } catch (error) {
            this.logger.error(
                `Failed to send push notification to multiple users: ${error.message}`,
                error.stack,
                { correlationId, userCount: userIds.length },
            );
            return false;
        }
    }
}

import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationConsumer } from './notification.consumer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { NotificationsModule } from '../notifications/notifications.module';
import * as amqp from 'amqplib';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'RABBITMQ_SERVICE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            `amqp://${configService.get<string>('rabbitmq.username')}:${configService.get<string>('rabbitmq.password')}@${configService.get<string>('rabbitmq.host')}:${configService.get<number>('rabbitmq.port')}`,
                        ],
                        queue: configService.get<string>('rabbitmq.queue'),
                        queueOptions: {
                            durable: true,
                        },
                        socketOptions: {
                            heartbeatIntervalInSeconds: 60,
                            reconnectTimeInSeconds: 5,
                        },
                        prefetchCount: 1,
                        // Manual acknowledgment in consumer
                        noAck: false,
                        maxConnectionAttempts: 10,
                        retryAttempts: 5,
                        retryDelay: 1000,
                        // CRITICAL: Disable reply queue for event-based communication
                        noAssert: true,
                    },
                }),
                inject: [ConfigService],
            },
        ]),
        TypeOrmModule.forFeature([Notification]),
        forwardRef(() => NotificationsModule),
    ],
    controllers: [NotificationConsumer],
    providers: [NotificationsService],
    exports: [ClientsModule],
})
export class RabbitMQModule implements OnModuleInit {
    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomLoggerService,
    ) {
        this.logger.setContext(RabbitMQModule.name);
    }

    async onModuleInit() {
        await this.setupRabbitMQ();
    }

    private async setupRabbitMQ() {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const rabbitMQUrl = `amqp://${this.configService.get<string>('rabbitmq.username')}:${this.configService.get<string>('rabbitmq.password')}@${this.configService.get<string>('rabbitmq.host')}:${this.configService.get<number>('rabbitmq.port')}`;
                const exchange = this.configService.get<string>('rabbitmq.exchange');
                const queue = this.configService.get<string>('rabbitmq.queue');
                const routingKey = this.configService.get<string>('rabbitmq.routingKey');

                this.logger.log(`Connecting to RabbitMQ to setup exchange and queue...`);

                const connection = await amqp.connect(rabbitMQUrl);
                const channel = await connection.createChannel();

                // Create exchange
                await channel.assertExchange(exchange, 'topic', { durable: true });
                this.logger.log(`Exchange '${exchange}' created/verified`);

                // Create queue
                await channel.assertQueue(queue, { durable: true });
                this.logger.log(`Queue '${queue}' created/verified`);

                // Bind queue to exchange with routing key
                await channel.bindQueue(queue, exchange, routingKey);
                this.logger.log(`Queue '${queue}' bound to exchange '${exchange}' with routing key '${routingKey}'`);

                await channel.close();
                await connection.close();

                this.logger.log('RabbitMQ setup completed successfully');
                return;
            } catch (error) {
                retryCount++;
                this.logger.warn(`RabbitMQ setup attempt ${retryCount}/${maxRetries} failed: ${error.message}`);

                if (retryCount >= maxRetries) {
                    this.logger.error('Failed to setup RabbitMQ after maximum retries. Service will continue without RabbitMQ.', error.stack);
                    return;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
        }
    }
}

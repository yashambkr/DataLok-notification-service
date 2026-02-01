const amqp = require('amqplib');

async function publishTestNotification() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect('amqp://admin:RabbitPass123@165.232.122.21:5672');
        const channel = await connection.createChannel();

        const queue = 'notifications.queue';

        // Test notification payload
        const notification = {
            userId: 'test-user-123',
            notificationType: 'TEST',
            displayName: 'Test OneSignal Notification',
            payload: {
                message: 'This is a test notification to verify OneSignal integration',
                timestamp: new Date().toISOString()
            }
        };

        // NestJS microservices expect messages in a specific format
        const message = {
            pattern: 'notification.created',
            data: notification
        };

        // Publish directly to queue (since consumer is listening to queue)
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );

        console.log('✅ Test notification published successfully to queue');
        console.log('Notification:', JSON.stringify(notification, null, 2));

        // Close connection after a short delay
        setTimeout(() => {
            channel.close();
            connection.close();
            process.exit(0);
        }, 500);

    } catch (error) {
        console.error('❌ Error publishing notification:', error.message);
        process.exit(1);
    }
}

publishTestNotification();

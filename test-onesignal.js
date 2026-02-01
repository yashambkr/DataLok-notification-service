const amqp = require('amqplib');

async function publishTestNotification() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect('amqp://admin:RabbitPass123@165.232.122.21:5672');
        const channel = await connection.createChannel();

        const exchange = 'notifications.exchange';
        const routingKey = 'notification.created';

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

        // Publish to exchange
        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(notification)),
            { persistent: true }
        );

        console.log('✅ Test notification published successfully');
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

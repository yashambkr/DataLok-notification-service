# RabbitMQ Client Integration Guide

This guide explains how external services can publish notification events to the RabbitMQ exchange for processing by the Notification Service.

## Overview

The Notification Service uses RabbitMQ for asynchronous event-driven communication. External services (like your Spring Boot backend) can publish notification events to the RabbitMQ exchange, which will then be consumed, processed, and delivered to users via push notifications.

## RabbitMQ Configuration

### Connection Details

```
Host: 165.232.122.21
Port: 5672
Username: admin
Password: RabbitPass123
```

### Exchange and Queue Setup

- **Exchange Name**: `notifications.exchange`
- **Exchange Type**: `topic`
- **Queue Name**: `notifications.queue`
- **Routing Key**: `notification.created`
- **Durable**: `true` (messages persist across restarts)

## Message Format

### Event Structure

All notification events must follow this JSON structure:

```json
{
  "userId": "string (required)",
  "notificationType": "enum (required)",
  "displayName": "string (required)",
  "message": "string (optional)",
  "payload": "object (optional)"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | UUID of the user who should receive the notification |
| `notificationType` | enum | Yes | Type of notification (see available types below) |
| `displayName` | string | Yes | Human-readable title for the notification |
| `message` | string | No | Custom notification message body |
| `payload` | object | No | Additional data specific to the notification type |

### Available Notification Types

#### User/Employee Operations
- `EMPLOYEE_CREATION`
- `EMPLOYEE_DEACTIVATION`
- `EMPLOYEE_ACTIVATION`
- `EMPLOYEE_UPDATE`
- `USER_PASSWORD_RESET`
- `USER_ROLE_CHANGE`


## Implementation Examples

### Java (Spring Boot with AMQP)

#### 1. Add Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

#### 2. Configure RabbitMQ

```java
@Configuration
public class RabbitMQConfig {

    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory connectionFactory = new CachingConnectionFactory();
        connectionFactory.setHost("165.232.122.21");
        connectionFactory.setPort(5672);
        connectionFactory.setUsername("admin");
        connectionFactory.setPassword("RabbitPass123");
        return connectionFactory;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jackson2JsonMessageConverter());
        return rabbitTemplate;
    }

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public TopicExchange notificationsExchange() {
        return new TopicExchange("notifications.exchange", true, false);
    }
}
```

#### 3. Create Notification Event DTO

```java
public class NotificationEvent {
    private String userId;
    private String notificationType;
    private String displayName;
    private String message;
    private Map<String, Object> payload;

    // Constructors, getters, and setters
}
```

#### 4. Publish Notification

```java
@Service
public class NotificationPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    private static final String EXCHANGE = "notifications.exchange";
    private static final String ROUTING_KEY = "notification.created";

    public void publishNotification(NotificationEvent event) {
        rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_KEY, event);
    }

    // Example usage
    public void notifySaleCompletion(String userId, String saleId, double amount) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("saleId", saleId);
        payload.put("amount", amount);
        payload.put("customerName", "John Doe");
        payload.put("items", 5);

        NotificationEvent event = new NotificationEvent();
        event.setUserId(userId);
        event.setNotificationType("SALE_COMPLETION");
        event.setDisplayName("Sale Completed Successfully");
        event.setMessage("Your sale has been completed successfully with a total of $" + amount);
        event.setPayload(payload);

        publishNotification(event);
    }
}
```

### Node.js (with amqplib)

#### 1. Install Dependencies

```bash
npm install amqplib
```

#### 2. Publish Notification

```javascript
const amqp = require('amqplib');

async function publishNotification(notificationEvent) {
    const connection = await amqp.connect('amqp://admin:RabbitPass123@165.232.122.21:5672');
    const channel = await connection.createChannel();

    const exchange = 'notifications.exchange';
    const routingKey = 'notification.created';

    await channel.assertExchange(exchange, 'topic', { durable: true });

    channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(notificationEvent)),
        { persistent: true }
    );

    console.log('Notification published:', notificationEvent);

    await channel.close();
    await connection.close();
}

// Example usage
const event = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    notificationType: 'SALE_COMPLETION',
    displayName: 'Sale Completed Successfully',
    message: 'Your sale has been completed successfully with a total of $1,250.50',
    payload: {
        saleId: 'SALE-2024-001',
        amount: 1250.50,
        customerName: 'John Doe',
        items: 5,
        branchName: 'Main Branch'
    }
};

publishNotification(event);
```

### Python (with pika)

#### 1. Install Dependencies

```bash
pip install pika
```

#### 2. Publish Notification

```python
import pika
import json

def publish_notification(notification_event):
    credentials = pika.PlainCredentials('admin', 'RabbitPass123')
    parameters = pika.ConnectionParameters(
        host='165.232.122.21',
        port=5672,
        credentials=credentials
    )

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    exchange = 'notifications.exchange'
    routing_key = 'notification.created'

    channel.exchange_declare(exchange=exchange, exchange_type='topic', durable=True)

    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=json.dumps(notification_event),
        properties=pika.BasicProperties(delivery_mode=2)  # persistent
    )

    print(f'Notification published: {notification_event}')

    connection.close()

# Example usage
event = {
    'userId': '123e4567-e89b-12d3-a456-426614174000',
    'notificationType': 'SALE_COMPLETION',
    'displayName': 'Sale Completed Successfully',
    'message': 'Your sale has been completed successfully with a total of $1,250.50',
    'payload': {
        'saleId': 'SALE-2024-001',
        'amount': 1250.50,
        'customerName': 'John Doe',
        'items': 5,
        'branchName': 'Main Branch'
    }
}

publish_notification(event)
```

## Example Notification Events

### Sale Completion

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "notificationType": "SALE_COMPLETION",
  "displayName": "Sale Completed Successfully",
  "message": "Your sale has been completed successfully with a total of $1,250.50",
  "payload": {
    "saleId": "SALE-2024-001",
    "amount": 1250.50,
    "customerName": "John Doe",
    "items": 5,
    "branchName": "Main Branch"
  }
}
```

### Low Stock Alert

```json
{
  "userId": "admin-user-id",
  "notificationType": "LOW_STOCK_ALERT",
  "displayName": "Low Stock Alert",
  "message": "Product 'iPhone 15 Pro' is running low on stock",
  "payload": {
    "itemId": "item-123",
    "itemName": "iPhone 15 Pro",
    "currentStock": 5,
    "minimumStock": 10,
    "branchId": "branch-001",
    "branchName": "Main Branch"
  }
}
```

### Employee Creation

```json
{
  "userId": "manager-user-id",
  "notificationType": "EMPLOYEE_CREATION",
  "displayName": "New Employee Added",
  "message": "Employee 'Jane Smith' has been successfully added to the system",
  "payload": {
    "employeeId": "emp-456",
    "employeeName": "Jane Smith",
    "role": "Sales Associate",
    "branchName": "Downtown Branch"
  }
}
```

## Testing

### Using the Built-in Test Endpoint

The Notification Service provides a test endpoint for easy testing:

```bash
POST http://localhost:3000/api/notifications/test/publish
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "notificationType": "SALE_COMPLETION",
  "displayName": "Sale Completed Successfully",
  "message": "Your sale has been completed successfully",
  "payload": {
    "saleId": "SALE-2024-001",
    "amount": 1250.50
  }
}
```

### Using RabbitMQ Management UI

1. Access the RabbitMQ Management UI at `http://165.232.122.21:15672`
2. Login with credentials (admin/RabbitPass123)
3. Navigate to the "Exchanges" tab
4. Click on `notifications.exchange`
5. Use the "Publish message" section to manually publish test messages

## Best Practices

1. **Always include userId**: Ensure the userId is valid and exists in your system
2. **Use appropriate notification types**: Choose the correct type from the enum list
3. **Provide meaningful messages**: Write clear, user-friendly notification messages
4. **Include relevant payload data**: Add contextual information that might be useful for the user
5. **Handle connection failures**: Implement retry logic and error handling in your publisher
6. **Use persistent messages**: Set delivery_mode=2 to ensure messages survive broker restarts
7. **Monitor message delivery**: Check RabbitMQ management UI for queue depth and message rates

## Troubleshooting

### Messages not being consumed

- Verify the exchange, queue, and routing key are correct
- Check that the Notification Service is running and connected to RabbitMQ
- Verify the queue binding exists between the exchange and queue

### Invalid message format

- Ensure your JSON matches the required structure
- Validate that notificationType is one of the allowed enum values
- Check that userId is a valid string

### Connection issues

- Verify network connectivity to RabbitMQ server
- Check credentials are correct
- Ensure firewall rules allow connections on port 5672

## Support

For issues or questions, contact the Notification Service team or check the service logs for detailed error messages.

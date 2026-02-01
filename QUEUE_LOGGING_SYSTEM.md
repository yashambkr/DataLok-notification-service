# Queue Message Logging System

## Overview

A comprehensive logging system has been implemented to track every RabbitMQ queue message with detailed information, processing metrics, and system health monitoring.

## Features

### 1. **Complete Message Tracking**
- Every queue message is logged with full details
- Message metadata (delivery tag, routing key, headers, etc.)
- Message content (sanitized for security)
- Processing time tracking
- Success/failure rates

### 2. **Enhanced Logger Service**
- Structured logging with correlation IDs
- Multiple log levels (error, warn, info, debug, verbose)
- JSON format for production, human-readable for development
- Specialized methods for different event types

### 3. **Queue-Specific Logging**
- Dedicated `QueueLoggerService` for RabbitMQ operations
- Message validation logging
- Processing metrics and performance monitoring
- Retry and dead letter queue tracking

### 4. **Automated Statistics**
- Periodic statistics logging (every 5 minutes)
- Detailed hourly reports
- Daily summaries with automatic reset
- System health monitoring based on metrics

## Log Types

### Message Reception
```json
{
  "timestamp": "2025-12-04T10:30:00.000Z",
  "level": "INFO",
  "context": "NotificationConsumer",
  "message": "Queue message received",
  "correlationId": "abc-123-def",
  "routingKey": "notification.created",
  "messageSize": 245,
  "messageProperties": {
    "messageId": "msg-456",
    "deliveryTag": 1,
    "redelivered": false,
    "exchange": "notifications.exchange",
    "routingKey": "notification.created"
  },
  "event": "queue_message_received"
}
```

### Message Processing
```json
{
  "timestamp": "2025-12-04T10:30:01.123Z",
  "level": "INFO",
  "context": "NotificationConsumer",
  "message": "Queue message processed successfully",
  "correlationId": "abc-123-def",
  "userId": "user-123",
  "notificationId": "notif-789",
  "notificationType": "SALE_COMPLETION",
  "processingTimeMs": 123,
  "event": "queue_message_processing_success"
}
```

### Processing Metrics
```json
{
  "timestamp": "2025-12-04T10:30:01.123Z",
  "level": "INFO",
  "context": "QueueLogger",
  "message": "Processing Metrics",
  "correlationId": "abc-123-def",
  "routingKey": "notification.created",
  "processingTimeMs": 123,
  "success": true,
  "event": "processing_metrics"
}
```

### System Health
```json
{
  "timestamp": "2025-12-04T11:00:00.000Z",
  "level": "INFO",
  "context": "QueueStatsTask",
  "message": "System Health: HEALTHY",
  "healthStatus": "healthy",
  "totalMessages": 1250,
  "totalFailures": 5,
  "overallSuccessRate": "99.60%",
  "averageProcessingTime": "145.23ms",
  "event": "system_health_check"
}
```

## Implementation Details

### 1. Enhanced CustomLoggerService

**New Methods Added:**
- `logQueueMessageReceived()` - Raw message reception
- `logQueueMessageValidation()` - Validation results
- `logQueueMessageProcessingStart()` - Processing initiation
- `logQueueMessageProcessingSuccess()` - Successful processing
- `logQueueMessageProcessingFailure()` - Failed processing
- `logQueueMessageAck()` - Message acknowledgment
- `logNotificationCreation()` - Database creation
- `logSocketEmission()` - Socket.IO events
- `logUnreadCountUpdate()` - Count updates

### 2. QueueLoggerService

**Features:**
- Detailed message logging with metadata
- Processing performance metrics
- Retry tracking
- Dead letter queue logging
- Statistics collection and reporting
- Message content sanitization for security

### 3. NotificationConsumer Updates

**Enhanced with:**
- Correlation ID generation for each message
- Detailed message metadata logging
- Processing time measurement
- Comprehensive error handling
- Retry detection and logging
- Success/failure metrics

### 4. Scheduled Statistics

**QueueStatsTask provides:**
- Every 5 minutes: Basic statistics
- Every hour: Detailed statistics and health check
- Daily at midnight: Summary and reset

## Configuration

### Log Levels
Set via `LOG_LEVEL` environment variable:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Informational messages (default)
- `debug` - Debug information
- `verbose` - All messages

### Environment Variables
```env
LOG_LEVEL=info
NODE_ENV=production
```

## Usage Examples

### Viewing Logs in Development
```bash
# Start the service
npm run start:dev

# Logs will show in console with human-readable format
[2025-12-04T10:30:00.000Z] [INFO] [NotificationConsumer] [abc-123] Queue message received | userId: user-123 | type: SALE_COMPLETION
```

### Viewing Logs in Production
```bash
# Logs are in JSON format for structured logging
docker logs -f notification-service | jq '.'

# Filter by event type
docker logs notification-service | jq 'select(.event == "queue_message_received")'

# Filter by correlation ID
docker logs notification-service | jq 'select(.correlationId == "abc-123-def")'
```

### Monitoring Queue Health
```bash
# View processing statistics
docker logs notification-service | jq 'select(.event == "queue_statistics")'

# View system health
docker logs notification-service | jq 'select(.event == "system_health_check")'

# View failed messages
docker logs notification-service | jq 'select(.event == "queue_message_processing_failed")'
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Success Rate**
   - Target: > 95%
   - Warning: < 95%
   - Critical: < 90%

2. **Processing Time**
   - Target: < 1000ms
   - Warning: > 2000ms
   - Critical: > 5000ms

3. **Message Volume**
   - Monitor for unusual spikes or drops
   - Track daily/hourly patterns

4. **Error Patterns**
   - Monitor for recurring errors
   - Track retry rates

### Sample Monitoring Queries

**For ELK Stack:**
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event": "system_health_check"}},
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

**For Grafana/Prometheus:**
```promql
# Success rate
(sum(rate(queue_messages_success_total[5m])) / sum(rate(queue_messages_total[5m]))) * 100

# Average processing time
avg(queue_processing_time_ms)

# Error rate
sum(rate(queue_messages_failed_total[5m]))
```

## Security Considerations

### Data Sanitization
- Sensitive fields are automatically redacted
- Message content is sanitized before logging
- Correlation IDs are used instead of sensitive identifiers

### Sensitive Fields (Auto-Redacted)
- `password`
- `token`
- `secret`
- `key`
- `auth`

### Log Retention
- Implement log rotation in production
- Consider data retention policies
- Ensure compliance with privacy regulations

## Troubleshooting

### Common Issues

1. **High Processing Times**
   - Check database connection
   - Monitor RabbitMQ performance
   - Review message complexity

2. **Low Success Rates**
   - Check validation errors
   - Review error logs
   - Monitor external dependencies

3. **Missing Logs**
   - Verify LOG_LEVEL setting
   - Check logger configuration
   - Ensure correlation IDs are generated

### Debug Commands

```bash
# Check current log level
curl http://165.232.122.21:3000/api/health

# View recent errors
docker logs --tail 100 notification-service | grep ERROR

# Monitor real-time logs
docker logs -f notification-service | grep "queue_message"

# Check statistics
docker logs notification-service | grep "queue_statistics" | tail -5
```

## Performance Impact

### Minimal Overhead
- Structured logging is optimized for performance
- Async logging where possible
- Configurable log levels to reduce verbosity

### Resource Usage
- Estimated 2-5% CPU overhead
- Memory usage: ~10MB for statistics storage
- Disk space: Depends on message volume and retention

## Future Enhancements

### Planned Features
1. **Metrics Export**
   - Prometheus metrics endpoint
   - Custom dashboards

2. **Advanced Analytics**
   - Message pattern analysis
   - Predictive failure detection

3. **Integration**
   - External monitoring systems
   - Alerting webhooks

4. **Performance Optimization**
   - Batch logging for high volume
   - Compression for large messages

## Conclusion

The comprehensive queue logging system provides complete visibility into RabbitMQ message processing, enabling:

- **Debugging** - Trace any message through the entire pipeline
- **Monitoring** - Real-time health and performance metrics
- **Analytics** - Historical data for optimization
- **Alerting** - Proactive issue detection

All queue messages are now fully logged with correlation IDs, processing metrics, and detailed metadata for complete observability.
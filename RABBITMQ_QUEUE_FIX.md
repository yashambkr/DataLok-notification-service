# RabbitMQ Queue Creation Issue - Fixed

## Problem
The application was creating over 10,000 queues in RabbitMQ, causing high load and resource consumption.

## Root Causes Identified

### 1. **noAck: true in Client Configuration**
- Location: `src/rabbitmq/rabbitmq.module.ts`
- Issue: Caused NestJS to create exclusive temporary queues per connection
- Fix: Changed to `noAck: false` for manual acknowledgment

### 2. **Missing noAssert Flag**
- Locations: `src/main.ts` and `src/rabbitmq/rabbitmq.module.ts`
- Issue: NestJS automatically creates reply queues for RPC-style communication, even when only using event patterns
- Fix: Added `noAssert: true` to both microservice and client configurations

### 3. **Health Check Creating Connections**
- Location: `src/health/health.controller.ts`
- Issue: Health check was creating a new RabbitMQ connection every 30 seconds (per Docker health check interval)
- Fix: Removed RabbitMQ health check, kept only database health check

### 4. **Shared Queue Between Environments**
- Location: `.env.staging` and `.env.prod`
- Issue: Both staging and production were using the same queue name (`notifications.queue`)
- Fix: Changed staging to use `notifications.queue.staging`

## Files Modified

1. **src/rabbitmq/rabbitmq.module.ts**
   - Changed `noAck: true` → `noAck: false`
   - Added `noAssert: true`

2. **src/main.ts**
   - Added `noAssert: true` to microservice configuration

3. **src/health/health.controller.ts**
   - Removed RabbitMQ health check
   - Kept only database health check

4. **.env.staging**
   - Changed queue name from `notifications.queue` → `notifications.queue.staging`

## Expected Result

After deployment:
- **Production**: Uses only 1 queue (`notifications.queue`)
- **Staging**: Uses only 1 queue (`notifications.queue.staging`)
- **Total**: 2 queues instead of 10,000+

## Deployment Steps

1. ✅ Code changes committed
2. Push to trigger CI/CD deployment
3. Clean up existing queues in RabbitMQ Management UI:
   - Access: http://161.97.171.189:15672
   - Login: admin / RabbitPass123
   - Delete all auto-generated queues (names like `amq.gen-...`, `amq.ctag-...`)
   - Keep only: `notifications.queue` and `notifications.queue.staging`
4. Monitor queue count after deployment

## Verification

After deployment, verify:
```bash
# Check running containers
docker ps | grep notification

# Check container logs
docker logs notification-service
docker logs notification-service-staging

# Verify only 2 queues exist in RabbitMQ Management UI
```

## Technical Details

### Why noAssert: true?
- Prevents NestJS from asserting (creating) reply queues
- Reply queues are only needed for request-response patterns
- We only use event patterns (fire-and-forget)

### Why remove RabbitMQ health check?
- Each health check creates a new connection
- With 30-second intervals, this creates 120 connections per hour
- Each connection could create temporary queues
- Database health check is sufficient for container health

### Why separate queues for staging/production?
- Prevents message cross-contamination
- Allows independent scaling and monitoring
- Follows best practices for environment isolation

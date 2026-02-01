# OneSignal Push Notification Integration

## Overview

This notification service is integrated with OneSignal to send push notifications to mobile devices when new notifications are created via RabbitMQ.

## Features

- ✅ Automatic push notifications when notifications are created
- ✅ Uses External User IDs (your application's userId)
- ✅ Non-blocking push notification sending
- ✅ Graceful degradation if OneSignal is not configured
- ✅ Detailed logging for debugging
- ✅ Custom data payload support

## Configuration

### Environment Variables

Add the following to your `.env`, `.env.staging`, and `.env.prod` files:

```env
# OneSignal Configuration
ONESIGNAL_APP_ID=your_onesignal_app_id_here
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key_here
```

### Getting OneSignal Credentials

1. Go to [OneSignal Dashboard](https://onesignal.com/)
2. Create or select your app
3. Navigate to **Settings** > **Keys & IDs**
4. Copy:
   - **OneSignal App ID**
   - **REST API Key**

## How It Works

### 1. External User ID Mapping

OneSignal uses **External User IDs** to map your application's user IDs to device subscriptions. This means:

- Your mobile app must call `OneSignal.setExternalUserId(userId)` after user login
- The notification service uses the same `userId` to send push notifications
- No need to store device tokens or player IDs in your database

### 2. Notification Flow

```
RabbitMQ Message → Consumer → Create Notification in DB → Send Push via OneSignal
                                                          ↓
                                                    User's Device
```

### 3. Push Notification Trigger

Push notifications are sent automatically when:
- A new notification is created from RabbitMQ consumer
- The notification is saved to the database
- OneSignal is properly configured

## Mobile App Integration

### Flutter/Dart Example

```dart
import 'package:onesignal_flutter/onesignal_flutter.dart';

// Initialize OneSignal
void initOneSignal() {
  OneSignal.shared.setAppId("YOUR_ONESIGNAL_APP_ID");

  // Request permission (iOS)
  OneSignal.shared.promptUserForPushNotificationPermission();
}

// Set External User ID after login
void setUserIdAfterLogin(String userId) {
  OneSignal.shared.setExternalUserId(userId);
}

// Remove External User ID on logout
void removeUserIdOnLogout() {
  OneSignal.shared.removeExternalUserId();
}

// Handle notification received
void setupNotificationHandlers() {
  OneSignal.shared.setNotificationWillShowInForegroundHandler((event) {
    // Handle notification when app is in foreground
    print('Notification received: ${event.notification.title}');

    // Access custom data
    var data = event.notification.additionalData;
    String? notificationId = data?['notificationId'];
    String? notificationType = data?['notificationType'];

    // Display the notification
    event.complete(event.notification);
  });

  OneSignal.shared.setNotificationOpenedHandler((openedResult) {
    // Handle notification tap
    print('Notification opened: ${openedResult.notification.title}');

    // Navigate to specific screen based on notification type
    var data = openedResult.notification.additionalData;
    String? notificationId = data?['notificationId'];

    // Navigate to notification details
    // Navigator.push(...);
  });
}
```

### React Native Example

```javascript
import OneSignal from 'react-native-onesignal';

// Initialize OneSignal
OneSignal.setAppId("YOUR_ONESIGNAL_APP_ID");

// Set External User ID after login
const setUserIdAfterLogin = (userId) => {
  OneSignal.setExternalUserId(userId);
};

// Remove External User ID on logout
const removeUserIdOnLogout = () => {
  OneSignal.removeExternalUserId();
};

// Handle notification received
OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent) => {
  const notification = notificationReceivedEvent.getNotification();
  const data = notification.additionalData;

  console.log('Notification received:', notification.title);
  console.log('Custom data:', data);

  // Display the notification
  notificationReceivedEvent.complete(notification);
});

// Handle notification opened
OneSignal.setNotificationOpenedHandler((openedEvent) => {
  const { notification } = openedEvent;
  const data = notification.additionalData;

  console.log('Notification opened:', notification.title);

  // Navigate based on notification data
  if (data.notificationId) {
    // Navigate to notification details
  }
});
```

## Push Notification Payload

### Notification Structure

When a push notification is sent, it includes:

**Title:** `notification.displayName`

**Message:** Extracted from `notification.payload` or default message

**Custom Data:**
```json
{
  "notificationId": "uuid",
  "notificationType": "ORDER_PLACED",
  "...": "other payload fields"
}
```

### Customizing the Message

The message is extracted from the notification payload in this order:
1. `payload.message`
2. `payload.description`
3. `payload.text`
4. Default: `"You have a new {notificationType} notification"`

You can customize this logic in `NotificationsService.formatNotificationMessage()`.

## Testing

### 1. Test with OneSignal Dashboard

1. Go to OneSignal Dashboard → **Messages** → **New Push**
2. Select **Send to Particular Users**
3. Enter your `userId` as External User ID
4. Send test notification

### 2. Test with API

```bash
# Publish a test notification to RabbitMQ
curl -X POST http://localhost:3000/api/notifications/test/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "test-user-123",
    "notificationType": "ORDER_PLACED",
    "displayName": "Order Placed",
    "payload": {
      "message": "Your order #12345 has been placed successfully",
      "orderId": "12345"
    }
  }'
```

### 3. Check Logs

Look for these log messages:
```
[OneSignalService] OneSignal client initialized successfully
[OneSignalService] Sending push notification via OneSignal
[OneSignalService] Push notification sent successfully
```

## Troubleshooting

### Push Notifications Not Received

1. **Check OneSignal Configuration**
   ```bash
   # Verify environment variables are set
   echo $ONESIGNAL_APP_ID
   echo $ONESIGNAL_REST_API_KEY
   ```

2. **Check Mobile App Setup**
   - Ensure `OneSignal.setExternalUserId(userId)` is called after login
   - Verify the userId matches the one in your database
   - Check OneSignal dashboard for subscribed devices

3. **Check Logs**
   - Look for "OneSignal not configured" warnings
   - Check for API errors in logs

4. **Verify User Subscription**
   - Go to OneSignal Dashboard → **Audience** → **All Users**
   - Search for your External User ID
   - Verify device is subscribed

### OneSignal API Errors

Common errors and solutions:

| Error | Solution |
|-------|----------|
| `Invalid app_id` | Check ONESIGNAL_APP_ID in .env |
| `Invalid REST API Key` | Check ONESIGNAL_REST_API_KEY in .env |
| `No subscribed users` | User hasn't set External User ID in mobile app |
| `Rate limit exceeded` | Reduce notification frequency or upgrade OneSignal plan |

#
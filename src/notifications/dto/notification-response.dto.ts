import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
    @ApiProperty({ description: 'Notification ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @ApiProperty({ description: 'Type of notification', enum: NotificationType, example: NotificationType.TASK_ASSIGN })
    notificationType: NotificationType;

    @ApiProperty({ description: 'Human-readable notification name', example: 'Order Placed' })
    displayName: string;

    @ApiProperty({ description: 'Notification message', nullable: true, required: false, example: 'Your order has been placed successfully' })
    message?: string | null;

    @ApiProperty({ description: 'Notification payload data', nullable: true, required: false, example: { orderId: '12345', amount: 99.99 } })
    payload?: Record<string, any> | null;

    @ApiProperty({ description: 'Whether the notification has been read', example: false })
    isRead: boolean;

    @ApiProperty({ description: 'Notification creation timestamp', example: '2024-01-01T12:00:00Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Timestamp when notification was read', nullable: true, example: null })
    readAt: Date | null;
}

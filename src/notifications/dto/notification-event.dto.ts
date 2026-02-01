import { IsString, IsNotEmpty, IsObject, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationEventDto {
    @ApiProperty({
        description: 'User ID to receive the notification',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        description: 'Type of notification',
        enum: NotificationType,
        example: NotificationType.TASK_ASSIGN,
        enumName: 'NotificationType',
    })
    @IsEnum(NotificationType)
    @IsNotEmpty()
    notificationType: 'task-assign' | 'task-invitation' | 'task-rejected' | 'task-approved';

    @ApiProperty({
        description: 'Human-readable notification name',
        example: 'Order Placed',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Custom notification message',
        required: false,
        example: 'Your sale has been completed successfully with a total of $1,250.50',
    })
    @IsString()
    @IsOptional()
    message?: string;

    @ApiProperty({
        description: 'Additional notification payload data',
        required: false,
        nullable: true,
        example: {
            saleId: 'SALE-2024-001',
            amount: 1250.50,
            customerName: 'John Doe',
            items: 5,
            branchName: 'Main Branch',
        },
    })
    @IsObject()
    @IsOptional()
    payload?: Record<string, any>;
}

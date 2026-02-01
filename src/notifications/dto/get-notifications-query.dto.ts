import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class GetNotificationsQueryDto {
    @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1, example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100, default: 20, example: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Filter by read status', type: Boolean, example: false })
    @IsOptional()
    isRead?: boolean;

    @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType, example: NotificationType.TASK_APPROVED })
    @IsOptional()
    @IsEnum(NotificationType)
    notificationType?: NotificationType;
}

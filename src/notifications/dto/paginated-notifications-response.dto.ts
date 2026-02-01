import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class PaginatedNotificationsResponseDto {
    @ApiProperty({ description: 'Array of notifications', type: [NotificationResponseDto] })
    data: NotificationResponseDto[];

    @ApiProperty({ description: 'Total number of notifications', example: 100 })
    total: number;

    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Number of items per page', example: 20 })
    limit: number;
}

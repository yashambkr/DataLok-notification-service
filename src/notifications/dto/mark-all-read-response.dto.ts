import { ApiProperty } from '@nestjs/swagger';

export class MarkAllReadResponseDto {
    @ApiProperty({ description: 'Number of notifications marked as read', example: 10 })
    updatedCount: number;
}

import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
    ) { }

    @ApiOperation({ summary: 'Health check', description: 'Check the health status of the service and database' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    @ApiResponse({ status: 503, description: 'Service is unhealthy' })
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Database health check only
            // RabbitMQ health check removed to prevent creating new connections every 30s
            () => this.db.pingCheck('database'),
        ]);
    }
}

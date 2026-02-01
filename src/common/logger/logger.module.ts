import { Module, Global } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';

/**
 * Global Logger Module
 * Makes the CustomLoggerService available throughout the application
 */
@Global()
@Module({
    providers: [CustomLoggerService],
    exports: [CustomLoggerService],
})
export class LoggerModule { }

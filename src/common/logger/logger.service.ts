import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
    correlationId?: string;
    userId?: string;
    notificationId?: string;
    notificationType?: string;
    [key: string]: any;
}

/**
 * Custom Logger Service with structured logging and correlation ID support
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
@Injectable()
export class CustomLoggerService implements LoggerService {
    private context?: string;
    private logLevel: string;

    constructor(private configService: ConfigService) {
        this.logLevel = this.configService.get<string>('logLevel') || 'info';
    }

    /**
     * Set the context for this logger instance
     */
    setContext(context: string) {
        this.context = context;
    }

    /**
     * Check if a log level should be logged based on current configuration
     */
    private shouldLog(level: string): boolean {
        const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex <= currentLevelIndex;
    }

    /**
     * Format log message with structured data
     */
    private formatMessage(
        level: string,
        message: string,
        context?: LogContext,
        trace?: string,
    ): string {
        const timestamp = new Date().toISOString();
        const logContext = this.context || 'Application';

        const logObject: any = {
            timestamp,
            level: level.toUpperCase(),
            context: logContext,
            message,
        };

        // Add correlation ID if present
        if (context?.correlationId) {
            logObject.correlationId = context.correlationId;
        }

        // Add user ID if present
        if (context?.userId) {
            logObject.userId = context.userId;
        }

        // Add notification ID if present
        if (context?.notificationId) {
            logObject.notificationId = context.notificationId;
        }

        // Add notification type if present
        if (context?.notificationType) {
            logObject.notificationType = context.notificationType;
        }

        // Add any additional context fields
        if (context) {
            const { correlationId, userId, notificationId, notificationType, ...rest } = context;
            if (Object.keys(rest).length > 0) {
                logObject.metadata = rest;
            }
        }

        // Add stack trace for errors
        if (trace) {
            logObject.trace = trace;
        }

        // In production, use JSON format for structured logging
        const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';
        if (nodeEnv === 'production') {
            return JSON.stringify(logObject);
        }

        // In development, use human-readable format
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${logContext}]`;

        if (context?.correlationId) {
            formattedMessage += ` [${context.correlationId}]`;
        }

        formattedMessage += ` ${message}`;

        if (context?.userId) {
            formattedMessage += ` | userId: ${context.userId}`;
        }

        if (context?.notificationId) {
            formattedMessage += ` | notificationId: ${context.notificationId}`;
        }

        if (context?.notificationType) {
            formattedMessage += ` | type: ${context.notificationType}`;
        }

        if (trace) {
            formattedMessage += `\n${trace}`;
        }

        return formattedMessage;
    }

    /**
     * Log an informational message
     */
    log(message: string, context?: LogContext) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, context));
        }
    }

    /**
     * Log an error message
     */
    error(message: string, trace?: string, context?: LogContext) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, context, trace));
        }
    }

    /**
     * Log a warning message
     */
    warn(message: string, context?: LogContext) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }

    /**
     * Log a debug message
     */
    debug(message: string, context?: LogContext) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }

    /**
     * Log a verbose message
     */
    verbose(message: string, context?: LogContext) {
        if (this.shouldLog('verbose')) {
            console.log(this.formatMessage('verbose', message, context));
        }
    }

    /**
     * Log RabbitMQ connection event
     */
    logRabbitMQConnection(status: 'connected' | 'disconnected' | 'error', error?: string) {
        if (status === 'error') {
            this.error(`RabbitMQ connection error: ${error}`, error);
        } else {
            this.log(`RabbitMQ ${status}`);
        }
    }

    /**
     * Log database connection event
     */
    logDatabaseConnection(status: 'connected' | 'disconnected' | 'error', error?: string) {
        if (status === 'error') {
            this.error(`Database connection error: ${error}`, error);
        } else {
            this.log(`Database ${status}`);
        }
    }
}

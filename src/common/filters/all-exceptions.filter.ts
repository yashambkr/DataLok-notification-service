import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { CustomLoggerService } from '../logger/logger.service';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger: CustomLoggerService;

    constructor(loggerService: CustomLoggerService) {
        this.logger = loggerService;
        this.logger.setContext(AllExceptionsFilter.name);
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const correlationId = (request as any).correlationId;

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal server error';
        let error = 'Internal Server Error';

        // Handle HttpException (includes NestJS built-in exceptions)
        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                error = exception.name;
            } else if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || exception.message;
                error = (exceptionResponse as any).error || exception.name;
            }

            // Log with appropriate level based on status code
            if (statusCode >= 500) {
                this.logger.error(
                    `HTTP ${statusCode} Error: ${JSON.stringify(message)}`,
                    exception.stack,
                    {
                        correlationId,
                        method: request.method,
                        url: request.url,
                        statusCode,
                    },
                );
            } else {
                this.logger.warn(
                    `HTTP ${statusCode} Error: ${JSON.stringify(message)}`,
                    {
                        correlationId,
                        method: request.method,
                        url: request.url,
                        statusCode,
                    },
                );
            }
        }
        // Handle TypeORM QueryFailedError
        else if (exception instanceof QueryFailedError) {
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Database query failed';
            error = 'Database Error';

            this.logger.error(
                `Database Error: ${exception.message}`,
                exception.stack,
                {
                    correlationId,
                    method: request.method,
                    url: request.url,
                    statusCode,
                },
            );
        }
        // Handle unknown errors
        else if (exception instanceof Error) {
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message || 'An unexpected error occurred';
            error = exception.name || 'Internal Server Error';

            this.logger.error(
                `Unhandled Error: ${exception.message}`,
                exception.stack,
                {
                    correlationId,
                    method: request.method,
                    url: request.url,
                    statusCode,
                },
            );
        }
        // Handle non-Error exceptions
        else {
            this.logger.error(
                `Unknown Exception: ${JSON.stringify(exception)}`,
                undefined,
                {
                    correlationId,
                    method: request.method,
                    url: request.url,
                    statusCode,
                },
            );
        }

        // Format and send error response
        const errorResponse = {
            statusCode,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        response.status(statusCode).json(errorResponse);
    }
}

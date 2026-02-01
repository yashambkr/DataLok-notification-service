import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to add correlation ID to requests for tracing
 * Requirement: 13.7 - Add correlation ID support for request tracing
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Check if correlation ID exists in headers, otherwise generate one
        const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

        // Attach correlation ID to request object
        (req as any).correlationId = correlationId;

        // Add correlation ID to response headers
        res.setHeader('x-correlation-id', correlationId);

        next();
    }
}

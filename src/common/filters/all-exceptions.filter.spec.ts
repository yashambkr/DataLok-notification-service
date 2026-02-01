import { AllExceptionsFilter } from './all-exceptions.filter';
import {
    HttpException,
    HttpStatus,
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;
    let mockResponse: any;
    let mockRequest: any;
    let mockArgumentsHost: ArgumentsHost;
    let mockLogger: any;

    beforeEach(async () => {
        mockLogger = {
            setContext: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        };

        filter = new AllExceptionsFilter(mockLogger);

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockRequest = {
            url: '/test-url',
            method: 'GET',
        };

        mockArgumentsHost = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: () => mockResponse,
                getRequest: () => mockRequest,
            }),
            getArgByIndex: jest.fn(),
            getArgs: jest.fn(),
            getType: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
        };
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    describe('HttpException handling', () => {
        it('should handle HttpException with string response', () => {
            const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Test error',
                    error: 'HttpException',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle BadRequestException', () => {
            const exception = new BadRequestException('Validation failed');

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Validation failed',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle NotFoundException', () => {
            const exception = new NotFoundException('Resource not found');

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Resource not found',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle UnauthorizedException', () => {
            const exception = new UnauthorizedException('Invalid token');

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.UNAUTHORIZED,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.UNAUTHORIZED,
                    message: 'Invalid token',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle HttpException with object response', () => {
            const exception = new HttpException(
                {
                    message: ['field1 error', 'field2 error'],
                    error: 'Validation Error',
                },
                HttpStatus.BAD_REQUEST,
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: ['field1 error', 'field2 error'],
                    error: 'Validation Error',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });
    });

    describe('TypeORM QueryFailedError handling', () => {
        it('should handle QueryFailedError', () => {
            const exception = new QueryFailedError(
                'SELECT * FROM users',
                [],
                new Error('Connection timeout'),
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Database query failed',
                    error: 'Database Error',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });
    });

    describe('Generic Error handling', () => {
        it('should handle generic Error', () => {
            const exception = new Error('Something went wrong');

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Something went wrong',
                    error: 'Error',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle Error with custom name', () => {
            const exception = new Error('Custom error');
            exception.name = 'CustomError';

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Custom error',
                    error: 'CustomError',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });
    });

    describe('Unknown exception handling', () => {
        it('should handle non-Error exceptions', () => {
            const exception = { someProperty: 'some value' };

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Internal server error',
                    error: 'Internal Server Error',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });

        it('should handle null exception', () => {
            const exception = null;

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Internal server error',
                    error: 'Internal Server Error',
                    timestamp: expect.any(String),
                    path: '/test-url',
                }),
            );
        });
    });

    describe('Response format', () => {
        it('should include all required fields in error response', () => {
            const exception = new BadRequestException('Test error');

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: expect.any(Number),
                    message: expect.anything(),
                    error: expect.any(String),
                    timestamp: expect.any(String),
                    path: expect.any(String),
                }),
            );
        });

        it('should format timestamp as ISO string', () => {
            const exception = new BadRequestException('Test error');

            filter.catch(exception, mockArgumentsHost);

            const callArgs = mockResponse.json.mock.calls[0][0];
            expect(() => new Date(callArgs.timestamp)).not.toThrow();
            expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });
});

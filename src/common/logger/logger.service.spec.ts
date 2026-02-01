import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from './logger.service';

describe('CustomLoggerService', () => {
    let service: CustomLoggerService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomLoggerService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'logLevel') return 'info';
                            if (key === 'nodeEnv') return 'test';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<CustomLoggerService>(CustomLoggerService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should set context', () => {
        service.setContext('TestContext');
        expect(service['context']).toBe('TestContext');
    });

    it('should log info messages', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.log('Test message', { userId: 'user123' });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log error messages with trace', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        service.setContext('TestContext');
        service.error('Error message', 'Stack trace', { userId: 'user123' });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log notification received event', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.logNotificationReceived('user123', 'EMPLOYEE_CREATION', 'corr-123');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log notification stored event', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.logNotificationStored('notif-123', 'user123', 'EMPLOYEE_CREATION', 'corr-123');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log notification emitted event', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.logNotificationEmitted('notif-123', 'user123', 'EMPLOYEE_CREATION', 'corr-123');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log RabbitMQ connection events', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.logRabbitMQConnection('connected');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log RabbitMQ connection errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        service.setContext('TestContext');
        service.logRabbitMQConnection('error', 'Connection failed');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log database connection events', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');
        service.logDatabaseConnection('connected');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should log database connection errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        service.setContext('TestContext');
        service.logDatabaseConnection('error', 'Connection failed');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should respect log level configuration', () => {
        const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
        service.setContext('TestContext');

        // Debug should not log when level is 'info'
        service.debug('Debug message');
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should include correlation ID in log context', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        service.setContext('TestContext');

        service.log('Test message', { correlationId: 'test-corr-id' });

        const logCall = consoleSpy.mock.calls[0][0];
        expect(logCall).toContain('test-corr-id');

        consoleSpy.mockRestore();
    });
});

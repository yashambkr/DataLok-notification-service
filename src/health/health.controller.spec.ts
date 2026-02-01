import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
    HealthCheckService,
    TypeOrmHealthIndicator,
    MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
    let controller: HealthController;
    let healthCheckService: HealthCheckService;
    let dbHealthIndicator: TypeOrmHealthIndicator;
    let microserviceHealthIndicator: MicroserviceHealthIndicator;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: jest.fn(),
                    },
                },
                {
                    provide: TypeOrmHealthIndicator,
                    useValue: {
                        pingCheck: jest.fn(),
                    },
                },
                {
                    provide: MicroserviceHealthIndicator,
                    useValue: {
                        pingCheck: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                'rabbitmq.username': 'guest',
                                'rabbitmq.password': 'guest',
                                'rabbitmq.host': 'localhost',
                                'rabbitmq.port': 5672,
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthCheckService = module.get<HealthCheckService>(HealthCheckService);
        dbHealthIndicator = module.get<TypeOrmHealthIndicator>(
            TypeOrmHealthIndicator,
        );
        microserviceHealthIndicator = module.get<MicroserviceHealthIndicator>(
            MicroserviceHealthIndicator,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('check', () => {
        it('should return health check result', async () => {
            const mockHealthCheckResult = {
                status: 'ok',
                info: {
                    database: { status: 'up' },
                    rabbitmq: { status: 'up' },
                },
                error: {},
                details: {
                    database: { status: 'up' },
                    rabbitmq: { status: 'up' },
                },
            };

            jest
                .spyOn(healthCheckService, 'check')
                .mockResolvedValue(mockHealthCheckResult as any);

            const result = await controller.check();

            expect(result).toEqual(mockHealthCheckResult);
            expect(healthCheckService.check).toHaveBeenCalledWith(
                expect.arrayContaining([expect.any(Function), expect.any(Function)]),
            );
        });

        it('should check database health', async () => {
            const mockDbCheck = jest.fn().mockResolvedValue({ database: { status: 'up' } });
            jest.spyOn(dbHealthIndicator, 'pingCheck').mockImplementation(mockDbCheck);

            jest.spyOn(healthCheckService, 'check').mockImplementation(async (checks) => {
                await checks[0]();
                return {} as any;
            });

            await controller.check();

            expect(dbHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
        });

        it('should check RabbitMQ health', async () => {
            const mockRabbitMQCheck = jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } });
            jest.spyOn(microserviceHealthIndicator, 'pingCheck').mockImplementation(mockRabbitMQCheck);

            jest.spyOn(healthCheckService, 'check').mockImplementation(async (checks) => {
                await checks[1]();
                return {} as any;
            });

            await controller.check();

            expect(microserviceHealthIndicator.pingCheck).toHaveBeenCalledWith(
                'rabbitmq',
                expect.objectContaining({
                    transport: expect.any(Number),
                    options: expect.objectContaining({
                        urls: expect.arrayContaining([
                            expect.stringContaining('amqp://guest:guest@localhost:5672'),
                        ]),
                    }),
                }),
            );
        });
    });
});

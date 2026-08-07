import { GameLifecycleService } from './game-lifecycle.service';

describe('GameLifecycleService', () => {
  const prisma = {
    bet: {
      findMany:    jest.fn(),
      updateMany:  jest.fn(),
      createMany:  jest.fn(),
    },
    gameRound: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    transaction: {
      create:     jest.fn(),
      createMany: jest.fn(),
    },
    $transaction:       jest.fn(),
    $executeRawUnsafe:  jest.fn(),
  };

  const profitCalculator = {
    calculateAllQuadProfits: jest.fn(),
  };

  const websocketGateway = {
    broadcast:        jest.fn(),
    broadcastToUser:  jest.fn(),
  };

  const settingsService = {
    getSettings: jest.fn().mockResolvedValue({ roundDuration: 60 }),
  };

  // Mock EventStreamService (Event Sourcing dependency)
  const mockPipeline = {
    incrbyfloat: jest.fn().mockReturnThis(),
    set:         jest.fn().mockReturnThis(),
    xadd:        jest.fn().mockReturnThis(),
    expire:      jest.fn().mockReturnThis(),
    exec:        jest.fn().mockResolvedValue([]),
  };

  const eventStream = {
    getExposure:           jest.fn().mockResolvedValue({ total: '0' }),
    initExposure:          jest.fn().mockResolvedValue(undefined),
    setActiveRound:        jest.fn().mockResolvedValue(undefined),
    getActiveRound:        jest.fn().mockResolvedValue('round-1'),
    isRoundAlreadySettled: jest.fn().mockResolvedValue(false),
    markRoundSettled:      jest.fn().mockResolvedValue(undefined),
    readAllEvents:         jest.fn().mockResolvedValue([]),
    appendEvent:           jest.fn().mockResolvedValue('1-0'),
    getLiveBalance:        jest.fn().mockResolvedValue('1000.00'),
    creditBalance:         jest.fn().mockResolvedValue('1500.00'),
    redisService: {
      getClient: jest.fn().mockReturnValue({
        pipeline: jest.fn().mockReturnValue(mockPipeline),
        rpush:    jest.fn().mockResolvedValue(1),
      }),
    },
  };

  let service: GameLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GameLifecycleService(
      prisma as any,
      profitCalculator as any,
      websocketGateway as any,
      settingsService as any,
      eventStream as any,
    );
    service.currentRoundId = 'round-1';
  });

  it('keeps a random result when there is no stake in the exposure hash', async () => {
    eventStream.getExposure.mockResolvedValue({ total: '0' });
    const randomSpy = jest.spyOn<any, any>(service as any, 'generateRandomQuad')
      .mockReturnValue([2, 4, 6, 8]);

    await (service as any).calculateResultForCurrentRound();

    expect(profitCalculator.calculateAllQuadProfits).not.toHaveBeenCalled();
    expect((service as any).currentResult).toEqual([2, 4, 6, 8]);
    randomSpy.mockRestore();
  });

  it('uses the calculator result when there is stake in the exposure hash', async () => {
    eventStream.getExposure.mockResolvedValue({
      '2': '50', '4': '50', '6': '50', '8': '50',
      total: '200',
    });
    profitCalculator.calculateAllQuadProfits.mockReturnValue({
      results: [{ opening: [8, 6, 4, 2], profit: 125 }],
    });

    await (service as any).calculateResultForCurrentRound();

    expect(profitCalculator.calculateAllQuadProfits).toHaveBeenCalledTimes(1);
    expect((service as any).currentResult).toEqual([2, 4, 6, 8]);
  });
});

import { GameLifecycleService } from './game-lifecycle.service';

describe('GameLifecycleService', () => {
  const prisma = {
    bet: {
      findMany: jest.fn(),
    },
    gameRound: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const profitCalculator = {
    calculateAllQuadProfits: jest.fn(),
  };

  const websocketGateway = {
    broadcast: jest.fn(),
    broadcastToUser: jest.fn(),
  };

  let service: GameLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GameLifecycleService(
      prisma as any,
      profitCalculator as any,
      websocketGateway as any,
    );
    service.currentRoundId = 'round-1';
  });

  it('keeps a random result when there are no active bets', async () => {
    prisma.bet.findMany.mockResolvedValue([]);
    const randomSpy = jest.spyOn<any, any>(service as any, 'generateRandomQuad').mockReturnValue([2, 4, 6, 8]);

    await (service as any).calculateResultForCurrentRound();

    expect(profitCalculator.calculateAllQuadProfits).not.toHaveBeenCalled();
    expect((service as any).currentResult).toEqual([2, 4, 6, 8]);
    expect((service as any).calculatedProfit).toBe(0);
    randomSpy.mockRestore();
  });

  it('uses the calculator result when there is stake in the round', async () => {
    prisma.bet.findMany.mockResolvedValue([
      {
        betType: 'QUAD',
        numbers: [8, 6, 4, 2],
        amount: 50,
      },
    ]);
    profitCalculator.calculateAllQuadProfits.mockReturnValue({
      results: [{ opening: [8, 6, 4, 2], profit: 125 }],
    });

    await (service as any).calculateResultForCurrentRound();

    expect(profitCalculator.calculateAllQuadProfits).toHaveBeenCalledTimes(1);
    expect((service as any).currentResult).toEqual([2, 4, 6, 8]);
    expect((service as any).calculatedProfit).toBe(125);
  });
});

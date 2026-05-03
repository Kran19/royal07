import { BetController } from './bet.controller';

describe('BetController', () => {
  const betService = {
    placeBet: jest.fn(),
    getHistory: jest.fn(),
    getRoundBets: jest.fn(),
    getCurrentRoundBets: jest.fn(),
  };

  let controller: BetController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BetController(betService as any);
  });

  it('returns round bets for a round id', async () => {
    betService.getRoundBets.mockResolvedValue({ success: true });

    const result = await controller.getRoundBets('round-123');

    expect(betService.getRoundBets).toHaveBeenCalledWith('round-123');
    expect(result).toEqual({ success: true });
  });

  it('loads current-round bets for the authenticated user', async () => {
    betService.getCurrentRoundBets.mockResolvedValue({ success: true });

    const req = { user: { userId: 'user-1' } } as any;
    const result = await controller.getCurrentRound(req);

    expect(betService.getCurrentRoundBets).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ success: true });
  });
});

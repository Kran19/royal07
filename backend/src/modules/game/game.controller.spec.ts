import { GameController } from './game.controller';

describe('GameController', () => {
  const gameService = {
    getCurrentRound: jest.fn(),
    getHistory: jest.fn(),
  };

  let controller: GameController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GameController(gameService as any);
  });

  it('requests the current round without requiring a user id', async () => {
    gameService.getCurrentRound.mockResolvedValue({ success: true });

    const result = await controller.getCurrentRound({ headers: {} } as any);

    expect(gameService.getCurrentRound).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({ success: true });
  });

  it('parses pagination for history requests', async () => {
    gameService.getHistory.mockResolvedValue({ success: true });

    await controller.getHistory('3', '15');

    expect(gameService.getHistory).toHaveBeenCalledWith(3, 15);
  });
});

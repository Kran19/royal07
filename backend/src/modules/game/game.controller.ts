import { Controller, Get, Req, Query } from '@nestjs/common';
import { GameService } from './game.service';
import type { Request } from 'express';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('current')
  async getCurrentRound(@Req() req: Request) {
    return this.resolveCurrentRound(req);
  }

  @Get('current-round')
  async getCurrentRoundAlias(@Req() req: Request) {
    return this.resolveCurrentRound(req);
  }

  @Get('history')
  async getHistory(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.gameService.getHistory(parseInt(page, 10), parseInt(limit, 10));
  }

  private async resolveCurrentRound(req: Request) {
    // Route is public. User ID can be parsed from token later if needed.
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      userId = undefined;
    }
    return this.gameService.getCurrentRound(userId);
  }
}

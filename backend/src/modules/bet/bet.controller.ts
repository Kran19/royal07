import { Controller, Post, Get, Body, Req, Query, UseGuards, Param } from '@nestjs/common';
import { BetService } from './bet.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('bets')
@UseGuards(JwtAuthGuard)
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post('place')
  async placeBet(@Req() req: Request, @Body() dto: PlaceBetDto) {
    const userId = (req.user as any).userId;
    return this.betService.placeBet(userId, dto);
  }

  @Get('history')
  async getHistory(@Req() req: Request, @Query('page') page = '1', @Query('limit') limit = '20') {
    const userId = (req.user as any).userId;
    return this.betService.getHistory(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get()
  async getAllBets(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    return this.betService.getAllBets(parseInt(page, 10), parseInt(limit, 10), {
      status,
      type,
      userId,
    });
  }

  @Get('round/:roundId')
  async getRoundBets(@Param('roundId') roundId: string) {
    return this.betService.getRoundBets(roundId);
  }

  @Get('current-round')
  async getCurrentRound(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.betService.getCurrentRoundBets(userId);
  }
}

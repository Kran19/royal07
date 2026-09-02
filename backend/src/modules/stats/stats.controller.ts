import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('current')
  async getCurrent() {
    return this.statsService.getCurrentStats();
  }

  @Get('high-bets')
  async getHighBets(@Query('limit') limit?: string, @Query('minAmount') minAmount?: string) {
    return this.statsService.getRecentHighBets(
      limit ? parseInt(limit, 10) : 10,
      minAmount ? parseFloat(minAmount) : 500
    );
  }

  @Get('historical')
  async getHistorical(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('interval') interval: string = '1h'
  ) {
    return this.statsService.getHistoricalStats(from, to, interval);
  }
}

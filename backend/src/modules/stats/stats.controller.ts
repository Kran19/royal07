import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('current')
  async getCurrent() {
    return this.statsService.getCurrentStats();
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

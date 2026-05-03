import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { BetStatsRepository } from './stats.repository';

@Module({
  controllers: [StatsController],
  providers: [StatsService, BetStatsRepository],
  exports: [StatsService, BetStatsRepository]
})
export class StatsModule {}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BetAggregatorWorker } from './bet-aggregator.worker';
import { StatsModule } from '../modules/stats/stats.module';
import { OpeningModule } from '../modules/opening/opening.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StatsModule,
    OpeningModule
  ],
  providers: [BetAggregatorWorker],
})
export class WorkerModule {}

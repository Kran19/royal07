import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventProcessorWorker } from '../events/event-processor.worker';
import { SettlementPersistenceWorker } from '../events/settlement-persistence.worker';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorModule } from '../modules/operator/operator.module';

/**
 * WorkerModule
 * ============
 * Houses all background workers for the Event Sourcing architecture.
 *
 * Workers:
 *   EventProcessorWorker         — Reads Redis Stream → batch-writes bets to Postgres (every 100ms)
 *   SettlementPersistenceWorker  — Reads settlement events → 4-query DB flush (every 200ms)
 *
 * Removed:
 *   BetAggregatorWorker — 5-second cron that ran GROUP BY queries on the Bet table.
 *   Replaced by: EventStreamService.getExposure() which reads the Redis Hash in O(1).
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventsModule,       // Provides EventStreamService
    PrismaModule,       // Provides PrismaService
    OperatorModule,     // Provides WalletCallbackService
  ],
  providers: [
    EventProcessorWorker,
    SettlementPersistenceWorker,
  ],
})
export class WorkerModule {}

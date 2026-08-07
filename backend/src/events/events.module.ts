import { Module } from '@nestjs/common';
import { EventStreamService } from './event-stream.service';
import { RedisModule } from '../modules/redis/redis.module';

/**
 * EventsModule
 * ============
 * Exports EventStreamService so it can be consumed by:
 *  - BetModule (bet placement)
 *  - GameModule (game lifecycle / settlement)
 *  - WorkerModule (event processor & settlement persistence workers)
 */
@Module({
  imports: [RedisModule],
  providers: [EventStreamService],
  exports: [EventStreamService],
})
export class EventsModule {}

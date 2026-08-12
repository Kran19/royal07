import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventStreamService } from '../events/event-stream.service';
import { BetPlacedEvent, EventType, RedisKeys } from '../events/event.types';

const GROUP_NAME = 'bet-processors';
const CONSUMER_NAME = `worker-${process.pid}`;
const BATCH_SIZE = 500;

/**
 * EventProcessorWorker
 * ====================
 * Reads BetPlacedEvents from Redis Streams every 100ms
 * and batch-inserts them into PostgreSQL.
 *
 * This is the bridge between the Redis "live" layer and the Postgres "permanent" layer.
 *
 * Flow:
 *   Redis Stream (round:{roundId}:bets)
 *     → XREADGROUP (up to 500 events)
 *     → prisma.bet.createMany()         (1 SQL query per batch)
 *     → prisma.transaction.createMany() (1 SQL query per batch)
 *     → XACK (mark events as processed)
 *
 * Concurrency: Only one instance runs at a time per process (Interval guard).
 * Multiple pod instances can safely share the same consumer group because
 * Redis XREADGROUP delivers each message to only one consumer.
 */
@Injectable()
export class EventProcessorWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventProcessorWorker.name);
  private isRunning = false;
  private currentStreamKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStream: EventStreamService,
  ) { }

  async onModuleInit() {
    this.logger.log(`EventProcessorWorker started (consumer: ${CONSUMER_NAME})`);
  }

  async onModuleDestroy() {
    this.logger.log('EventProcessorWorker shutting down...');
  }

  /**
   * Main processing loop — fires every 100ms.
   * Reads the stream for the currently active round and batch-writes to Postgres.
   */
  @Interval(100)
  async processBatch() {
    // Prevent re-entrant execution if previous batch is still running
    if (this.isRunning) return;

    const activeRoundId = await this.eventStream.getActiveRound();
    if (!activeRoundId) return;

    const streamKey = RedisKeys.roundBetsStream(activeRoundId);

    // If the round changed, ensure consumer group exists for new stream
    if (streamKey !== this.currentStreamKey) {
      await this.eventStream.ensureConsumerGroup(streamKey, GROUP_NAME, '0');
      this.currentStreamKey = streamKey;
    }

    this.isRunning = true;
    try {
      const entries = await this.eventStream.readBatch(
        streamKey,
        GROUP_NAME,
        CONSUMER_NAME,
        BATCH_SIZE,
      );

      if (entries.length === 0) return;

      this.logger.debug(`Processing batch of ${entries.length} bet events`);

      // Parse all events
      const events: BetPlacedEvent[] = entries
        .map(e => {
          try { return JSON.parse(e.data) as BetPlacedEvent; }
          catch { return null; }
        })
        .filter((e): e is BetPlacedEvent => e !== null && e.type === EventType.BET_PLACED);

      if (events.length === 0) {
        // Ack malformed entries so they don't block the queue
        await this.eventStream.acknowledge(streamKey, GROUP_NAME, entries.map(e => e.id));
        return;
      }

      const betRows = events.map(ev => ({
        id: ev.eventId,
        userId: ev.userId,
        roundId: ev.roundId,
        betType: ev.betType as any,
        numbers: ev.numbers,
        amount: ev.amount,
        status: 'ACTIVE' as const,
      }));

      // Build transaction rows for createMany (BET_PLACED records)
      const txRows = events.map(ev => ({
        userId: ev.userId,
        type: 'BET_PLACED' as const,
        amount: ev.totalDeducted,
        balanceBefore: ev.balanceBefore,
        balanceAfter: ev.balanceAfter,
        status: 'COMPLETED' as const,
        description: `Placed ${ev.betType} bet on [${ev.numbers.join(', ')}] @ ₹${ev.amount}/floor`,
      }));

      // Aggregate deductions by user to update Postgres in bulk
      const userDeductions = new Map<string, number>();
      for (const ev of events) {
        const existing = userDeductions.get(ev.userId) || 0;
        userDeductions.set(ev.userId, existing + parseFloat(ev.totalDeducted));
      }

      // Single transaction: insert bets + transaction records together
      await this.prisma.$transaction(async (tx) => {
        await tx.bet.createMany({
          data: betRows,
          skipDuplicates: true, // Safe guard against double-processing
        });
        await tx.transaction.createMany({
          data: txRows as any,
          skipDuplicates: true,
        });

        // Deduct balances in Postgres in bulk using a raw SQL CASE update
        // Generates CASE statements: "WHEN 'userId_A' THEN 200 WHEN 'userId_B' THEN 400"
        if (userDeductions.size > 0) {
          const caseStatements = Array.from(userDeductions.entries())
            .map(([uid, deduct]) => `WHEN '${uid}' THEN ${deduct.toFixed(2)}::numeric`)
            .join('\n            ');
          const inClause = Array.from(userDeductions.keys())
            .map(uid => `'${uid}'`)
            .join(', ');

          // Runs a single SQL UPDATE query to modify all balances at once:
          await tx.$executeRawUnsafe(`
            UPDATE "User"
            SET
              balance   = balance - CASE id ${caseStatements} END,
              "updatedAt" = NOW(),
              version  = version + 1
            WHERE id IN (${inClause})
          `);
        }
      });

      // Acknowledge all successfully processed entries
      await this.eventStream.acknowledge(
        streamKey,
        GROUP_NAME,
        entries.map(e => e.id),
      );

      this.logger.debug(`Batch complete: inserted ${events.length} bets into Postgres`);

    } catch (err) {
      this.logger.error('EventProcessorWorker batch failed:', err);
      // Do NOT ack on failure — Redis will redeliver after visibility timeout
    } finally {
      this.isRunning = false;
    }
  }
}

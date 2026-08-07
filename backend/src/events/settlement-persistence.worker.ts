import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventStreamService } from '../events/event-stream.service';
import {
  BetWonEvent,
  BetLostEvent,
  RoundClosedEvent,
  EventType,
  RedisKeys,
} from '../events/event.types';

/**
 * SettlementPersistenceWorker
 * ============================
 * Reads settlement events (BET_WON / BET_LOST / ROUND_CLOSED) from
 * `global:settlement:{roundId}` and writes them to PostgreSQL using
 * exactly 4 bulk queries, regardless of how many users participated.
 *
 * This worker fires AFTER the game lifecycle has already:
 *   1. Credited winner balances in Redis (instant)
 *   2. Broadcast WebSocket results to all players (instant)
 *   3. Appended BET_WON / BET_LOST / ROUND_CLOSED events to the settlement stream
 *
 * This worker's job is purely the async database persistence.
 *
 * The 4 DB Queries:
 *   Q1: bet.updateMany()           → Mark ALL bets in round as SETTLED (1 query)
 *   Q2: Raw SQL bulk UPDATE        → Credit ALL winner balances in Postgres (1 query)
 *   Q3: transaction.createMany()   → Insert ALL winner TX records (1 query)
 *   Q4: gameRound.update()         → Write final financial stats (1 query)
 */
@Injectable()
export class SettlementPersistenceWorker {
  private readonly logger = new Logger(SettlementPersistenceWorker.name);

  /** Set of roundIds currently being persisted — prevents concurrent runs */
  private readonly processingRounds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStream: EventStreamService,
  ) {}

  /**
   * Checks the global settlement queue every 200ms.
   * Reads pending settlement streams and flushes them to Postgres.
   *
   * We use a separate Redis key `settlement:queue` that holds a list of
   * roundIds that are ready to be persisted. The game lifecycle pushes
   * to this list when it finishes settlement.
   */
  @Interval(200)
  async persistPendingSettlements() {
    const client = (this.eventStream as any).redisService.getClient();

    // Pop a roundId from the settlement queue (LPOP is atomic)
    const roundId = await client.lpop('settlement:persist:queue');
    if (!roundId) return;

    if (this.processingRounds.has(roundId)) {
      // Push back and skip — already being processed
      await client.rpush('settlement:persist:queue', roundId);
      return;
    }

    this.processingRounds.add(roundId);
    try {
      await this.persistSettlement(roundId);
    } catch (err) {
      this.logger.error(
        `Failed to persist settlement for round ${roundId} — will retry in 200ms`,
        (err as Error)?.message,
      );
      // Push roundId back to the END of queue so other rounds aren't blocked.
      // Next worker tick (200ms) will re-attempt this round.
      await client.rpush('settlement:persist:queue', roundId);
    } finally {
      this.processingRounds.delete(roundId);
    }
  }

  /**
   * Reads all settlement events for a round and writes them to Postgres
   * using exactly 4 bulk queries.
   */
  async persistSettlement(roundId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Persisting settlement for round ${roundId}...`);

    const streamKey = RedisKeys.settlementStream(roundId);
    const allEntries = await this.eventStream.readAllEvents(streamKey);

    if (allEntries.length === 0) {
      this.logger.warn(`No settlement events found for round ${roundId}`);
      return;
    }

    // Parse all events
    const wonEvents: BetWonEvent[] = [];
    const lostEvents: BetLostEvent[] = [];
    let roundClosedEvent: RoundClosedEvent | null = null;

    for (const entry of allEntries) {
      try {
        const event = JSON.parse(entry.data);
        if (event.type === EventType.BET_WON)      wonEvents.push(event);
        else if (event.type === EventType.BET_LOST) lostEvents.push(event);
        else if (event.type === EventType.ROUND_CLOSED) roundClosedEvent = event;
      } catch {
        this.logger.warn(`Failed to parse settlement event: ${entry.data}`);
      }
    }

    if (!roundClosedEvent) {
      this.logger.error(`ROUND_CLOSED event missing for round ${roundId} — skipping`);
      return;
    }

    // ─── Query 1: Mark ALL bets in this round as SETTLED (1 query) ───
    await this.prisma.bet.updateMany({
      where: { roundId, status: 'ACTIVE' },
      data:  { status: 'SETTLED' },
    });
    this.logger.debug(`Q1 done: all bets in round ${roundId} marked SETTLED`);

    // ─── Query 2: Bulk credit winner balances in Postgres (1 raw SQL query) ───
    if (wonEvents.length > 0) {
      // Build CASE WHEN SQL for bulk update
      const payoutMap = new Map<string, number>();
      for (const ev of wonEvents) {
        const existing = payoutMap.get(ev.userId) || 0;
        payoutMap.set(ev.userId, parseFloat((existing + parseFloat(ev.payout)).toFixed(2)));
      }

      const caseStatements = Array.from(payoutMap.entries())
        .map(([uid, payout]) => `WHEN '${uid}' THEN ${payout.toFixed(2)}::numeric`)
        .join('\n    ');
      const inClause = Array.from(payoutMap.keys())
        .map(uid => `'${uid}'`)
        .join(', ');

      await this.prisma.$executeRawUnsafe(`
        UPDATE "User"
        SET
          balance   = balance + CASE id ${caseStatements} END,
          "totalWon" = "totalWon" + CASE id ${caseStatements} END,
          "updatedAt" = NOW(),
          version  = version + 1
        WHERE id IN (${inClause})
      `);
      this.logger.debug(`Q2 done: credited ${payoutMap.size} winners in Postgres`);
    }

    // ─── Query 3: Insert all winner Transaction records (1 query) ───
    if (wonEvents.length > 0) {
      const txRows = wonEvents.map(ev => ({
        userId:        ev.userId,
        type:          'BET_WON' as const,
        amount:        ev.payout,
        // ✅ BUG #2 FIX: Real balance values captured during settlement execution
        balanceBefore: (ev as any).balanceBefore || '0',
        balanceAfter:  (ev as any).balanceAfter  || '0',
        status:        'COMPLETED' as const,
        reference:     ev.betId || undefined,
        description:   `Won ${ev.betType} bet on [${ev.numbers.join(', ')}] — result [${ev.result.join(', ')}]`,
      }));

      await this.prisma.transaction.createMany({
        data: txRows as any,
        skipDuplicates: true,
      });
      this.logger.debug(`Q3 done: inserted ${txRows.length} winner transaction records`);
    }

    // ─── Query 4: Update GameRound with final financial stats (1 query) ───
    await this.prisma.gameRound.update({
      where: { id: roundId },
      data: {
        openingResult: roundClosedEvent.result,
        totalStake:    roundClosedEvent.totalStake as any,
        totalPayout:   roundClosedEvent.totalPayout as any,
        houseProfit:   roundClosedEvent.houseProfit as any,
        status:        'SETTLED',
        endedAt:       new Date(),
        version:       { increment: 1 },
      } as any,
    });
    this.logger.debug(`Q4 done: GameRound ${roundId} marked SETTLED`);

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Settlement persisted for round ${roundId} in ${elapsed}ms | ` +
      `Winners: ${wonEvents.length} | Losers: ${lostEvents.length}`
    );
  }
}

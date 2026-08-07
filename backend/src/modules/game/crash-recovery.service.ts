import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * CrashRecoveryService
 * =====================
 * Runs ONCE on backend startup (before the game engine starts new rounds).
 *
 * Problem it solves:
 *   If the backend crashes mid-round (after bets are in Postgres but before
 *   settlement runs), the GameRound is left in "ACTIVE" status permanently.
 *   Players who bet in that round have their balance deducted but never get
 *   a win/loss result — they simply lose their money.
 *
 * Solution:
 *   On startup, scan for any ACTIVE rounds. For each abandoned round:
 *     1. Refund 100% of every bet back to the player's Postgres balance
 *     2. Create a REFUND transaction record for the audit log
 *     3. Mark all bets as CANCELLED
 *     4. Mark the round as CANCELLED
 */
import { EventStreamService } from '../../events/event-stream.service';
import { RedisKeys } from '../../events/event.types';

@Injectable()
export class CrashRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(CrashRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStream: EventStreamService,
  ) {}

  async onModuleInit() {
    await this.recoverAbandonedRounds();
  }

  async recoverAbandonedRounds(): Promise<void> {
    const abandonedRounds = await this.prisma.gameRound.findMany({
      where: { status: 'ACTIVE' },
      include: {
        bets: {
          where: { status: 'ACTIVE' },
          select: { id: true, userId: true, amount: true },
        },
      },
    });

    if (abandonedRounds.length === 0) {
      this.logger.log('CrashRecovery: No abandoned rounds found. System is clean ✅');
      return;
    }

    this.logger.warn(
      `CrashRecovery: Found ${abandonedRounds.length} abandoned round(s). Starting auto-refund...`
    );

    for (const round of abandonedRounds) {
      await this.refundAndCancelRound(round);
    }

    this.logger.log('CrashRecovery: All abandoned rounds processed ✅');
  }

  private async refundAndCancelRound(round: {
    id: string;
    roundNumber: number;
    bets: Array<{ id: string; userId: string; amount: any }>;
  }): Promise<void> {
    if (round.bets.length === 0) {
      await this.prisma.gameRound.update({
        where: { id: round.id },
        data: { status: 'CANCELLED', endedAt: new Date() } as any,
      });
      this.logger.log(`CrashRecovery: Round #${round.roundNumber} had no bets — cancelled cleanly`);
      return;
    }

    this.logger.warn(
      `CrashRecovery: Refunding ${round.bets.length} bets in round #${round.roundNumber}...`
    );

    const refundMap = new Map<string, number>();
    for (const bet of round.bets) {
      const existing = refundMap.get(bet.userId) || 0;
      refundMap.set(bet.userId, existing + parseFloat(bet.amount.toString()));
    }

    await this.prisma.$transaction(async (tx) => {
      // Q1: Cancel all bets
      await tx.bet.updateMany({
        where: { roundId: round.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      // Q2: Bulk refund all users in one SQL query
      if (refundMap.size > 0) {
        const caseStatements = Array.from(refundMap.entries())
          .map(([uid, refund]) => `WHEN '${uid}' THEN ${refund.toFixed(2)}::numeric`)
          .join('\n            ');
        const inClause = Array.from(refundMap.keys())
          .map(uid => `'${uid}'`)
          .join(', ');

        await tx.$executeRawUnsafe(`
          UPDATE "User"
          SET
            balance     = balance + CASE id ${caseStatements} END,
            "updatedAt" = NOW(),
            version     = version + 1
          WHERE id IN (${inClause})
        `);
      }

      // Q3: Insert REFUND transaction records
      const refundTxRows = round.bets.map(bet => ({
        userId:      bet.userId,
        type:        'ADJUSTMENT' as const, // Changed from REFUND to valid Prisma Enum
        amount:      bet.amount.toString(),
        balanceBefore: '0',
        balanceAfter:  '0',
        status:      'COMPLETED' as const,
        reference:   bet.id,
        description: `Auto-refund: Round #${round.roundNumber} was abandoned due to server restart`,
      }));

      await tx.transaction.createMany({
        data: refundTxRows as any,
        skipDuplicates: true,
      });

      // Q4: Cancel the round
      await tx.gameRound.update({
        where: { id: round.id },
        data: { status: 'CANCELLED', endedAt: new Date() } as any,
      });
    });

    // Q5: Clear the refunded users' balances from Redis
    // So that their next request automatically pulls the new refunded balance from Postgres
    const redisClient = (this.eventStream as any).redisService.getClient();
    for (const uid of refundMap.keys()) {
      await redisClient.del(RedisKeys.userBalance(uid));
      await redisClient.del(RedisKeys.userBalanceVersion(uid));
    }

    const totalRefunded = Array.from(refundMap.values()).reduce((a, b) => a + b, 0);
    this.logger.warn(
      `CrashRecovery: Round #${round.roundNumber} cancelled. ` +
      `Refunded ₹${totalRefunded.toFixed(2)} to ${refundMap.size} users ✅`
    );
  }
}

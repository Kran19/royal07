import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { SettingsService } from '../settings/settings.service';
import { BetStatus, BetType } from '@prisma/client';
import { EventStreamService } from '../../events/event-stream.service';
import { BetPlacedEvent, EventType, LuaBetResult, RedisKeys } from '../../events/event.types';
import * as crypto from 'crypto';
import { WalletCallbackService } from '../operator/wallet-callback.service';

@Injectable()
export class BetService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private eventStream: EventStreamService,
    private walletCallback: WalletCallbackService,
  ) {}

  /**
   * placeBet — Event Sourcing Hot Path
   * ====================================
   * This method is the critical performance path that handles 100k+ concurrent requests.
   *
   * OLD APPROACH (❌ slow):
   *   prisma.$transaction(
   *     SELECT user → UPDATE balance → INSERT bet → INSERT transaction
   *   ) — 4 sequential DB round-trips per bet, blocks under load.
   *
   * NEW APPROACH (✅ fast):
   *   1. Validate round ACTIVE from Redis (0 DB queries)
   *   2. Ensure Redis balance is seeded (1 DB query only if not yet seeded)
   *   3. Atomic Lua script: check balance + deduct + update exposure + append event
   *   4. Return response to user immediately
   *   5. Background worker handles DB persistence (batch of 500 every 100ms)
   *
   * Total DB queries on hot path: 0 or 1 (one-time seed only)
   */
  async placeBet(userId: string, dto: PlaceBetDto, clientEventId?: string) {
    // ── 1. Validate round from Redis (no DB query) ──────────────────
    const activeRoundId = await this.eventStream.getActiveRound();
    if (!activeRoundId) {
      throw new BadRequestException({
        success: false,
        error: { code: 'BET_005', message: 'No active round found' },
      });
    }

    // ── 2. Check system settings (cached in Redis by SettingsService) ──
    const settingsResponse = await this.settingsService.getSettings();
    if (settingsResponse.data?.maintenanceMode) {
      throw new BadRequestException({
        success: false,
        error: { code: 'BET_MAINTENANCE', message: 'System is currently under maintenance' },
      });
    }

    const minBet = settingsResponse.data?.minBetAmount || 10;
    const maxBet = settingsResponse.data?.maxBetAmount || 100000;

    const amount = new Decimal(dto.amount);
    const totalDeducted = (dto.betType as string) === 'SINGLE'
      ? amount.mul(dto.numbers.length)
      : amount;

    if (amount.lt(minBet)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'BET_006', message: `Minimum stake amount per bet is ₹${minBet}` },
      });
    }
    if (totalDeducted.gt(maxBet)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'BET_007', message: `Maximum total bet risk cannot exceed ₹${maxBet}` },
      });
    }

    // ── 3. Ensure Redis balance is seeded ─────────────────────────────
    // Only happens once per user session (when the key doesn't exist in Redis).
    const existingRedisBalance = await this.eventStream.getLiveBalance(userId);
    if (existingRedisBalance === null) {
      // Cold start: load from Postgres and seed Redis
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new BadRequestException({
          success: false,
          error: { code: 'BET_008', message: 'User account not found or inactive' },
        });
      }

      await this.eventStream.seedUserBalance(userId, user.balance.toFixed(2));
    }

    // ── 4. Build the event payload ────────────────────────────────────
    // Use client-provided eventId for idempotency, or generate one server-side.
    const eventId = clientEventId || `${userId}-${activeRoundId}-${Date.now()}-${crypto.randomUUID()}`;
    const ts = Date.now();

    // We don't know balanceBefore precisely without an extra Redis read.
    // The Lua script will read it atomically. We store it here for the event log.
    const balanceBefore = (await this.eventStream.getLiveBalance(userId)) || '0';

    const eventPayload: BetPlacedEvent = {
      eventId,
      type:          EventType.BET_PLACED,
      roundId:       activeRoundId,
      userId,
      betType:       dto.betType as string,
      numbers:       dto.numbers,
      amount:        amount.toFixed(2),
      totalDeducted: totalDeducted.toFixed(2),
      balanceBefore,
      balanceAfter:  '0', // Will be filled after Lua returns the new balance
      ts,
    };

    // ── 5. Build exposure fields for Lua script ───────────────────────
    // The exposure hash stores the REAL PAYOUT RISK per floor, not just the stake.
    // This is what the admin dashboard risk chart reads.
    //
    // SINGLE: each floor contributes amount × 3 (e.g., ₹100 bet → ₹300 payout risk per floor)
    // PAIR:   each floor in the pair contributes amount × 10 (e.g., ₹100 → ₹1,000 risk per floor)
    // TRIPLE: each floor contributes amount × 20
    // QUAD:   each floor contributes amount × 30
    //
    // This way the admin sees the TRUE exposure: "If floor X opens, how much do I have to pay out?"
    const EXPOSURE_MULTIPLIERS: Record<string, number> = {
      SINGLE: 3,
      PAIR:   10,
      TRIPLE: 20,
      QUAD:   30,
    };
    const betTypeStr = dto.betType as string;
    const exposureMultiplier = EXPOSURE_MULTIPLIERS[betTypeStr] || 1;
    const exposureFields: Array<{ field: string; inc: string }> = [];

    for (const floor of dto.numbers) {
      // Each floor in a winning combination carries the full payout risk of this bet
      const floorExposure = amount.mul(exposureMultiplier).toFixed(2);
      exposureFields.push({ field: floor.toString(), inc: floorExposure });
    }
    // Total exposure = actual money deducted from user (for totalStake tracking)
    exposureFields.push({ field: 'total', inc: totalDeducted.toFixed(2) });

    // ── 6. ⚡ OPERATOR WALLET AUTH — MUST SUCCEED BEFORE REDIS DEDUCTION ──
    // For B2B federated users: call the operator's /betrequest synchronously.
    // If the operator declines (INSUFFICIENT_FUNDS, USER_NOT_FOUND, timeout),
    // the bet is rejected immediately. No money moves in Redis.
    // For B2C users (no operatorId): this is a no-op and returns { success: true }.
    const operatorAuth = await this.walletCallback.debitBetSync(
      userId,
      eventId,               // use eventId as the idempotent transactionId
      activeRoundId,
      totalDeducted.toNumber(),
      '',                    // session token — populated from UserSession if needed
      0,                     // roundNumber not available here; worker resolves it
    );

    if (!operatorAuth.success) {
      const statusMap: Record<string, { code: string; message: string }> = {
        'INSUFFICIENT_FUNDS':   { code: 'BET_001', message: 'Insufficient balance on your account' },
        'DUPLICATE_TRANSACTION':{ code: 'BET_DUP', message: 'Duplicate bet transaction' },
        'USER_NOT_FOUND':       { code: 'BET_008', message: 'User not found on operator platform' },
        'OPERATOR_UNREACHABLE': { code: 'BET_010', message: 'Operator wallet service is unavailable. Try again shortly.' },
      };
      const mapped = statusMap[operatorAuth.status] || { code: 'BET_011', message: operatorAuth.message || 'Bet rejected by operator' };
      throw new BadRequestException({
        success: false,
        error: { code: mapped.code, message: mapped.message, operatorStatus: operatorAuth.status },
      });
    }

    // ── 7. Execute Atomic Lua Script ──────────────────────────────────
    // Operator has confirmed the debit — now deduct from Redis atomically.
    eventPayload.balanceAfter = '0'; // placeholder
    const payloadWithPlaceholder = JSON.stringify(eventPayload);

    const luaResult = await this.eventStream.executePlaceBet({
      userId,
      eventId,
      roundId: activeRoundId,
      totalDeducted: totalDeducted.toFixed(2),
      eventPayload:  payloadWithPlaceholder,
      exposureFields,
    });

    // ── 8. Handle Lua return codes ────────────────────────────────────
    switch (luaResult.status) {
      case LuaBetResult.SUCCESS:
        break; // Continue

      case LuaBetResult.INSUFFICIENT:
        throw new BadRequestException({
          success: false,
          error: {
            code:    'BET_001',
            message: 'Insufficient balance',
            details: {
              balance:  parseFloat(luaResult.newBalance),
              required: totalDeducted.toNumber(),
            },
          },
        });

      case LuaBetResult.DUPLICATE:
        // Idempotent — treat as success (bet was already placed)
        return {
          success: true,
          data: {
            betId:        eventId,
            status:       'ACTIVE',
            balanceBefore: parseFloat(balanceBefore),
            balanceAfter:  parseFloat(luaResult.newBalance),
            duplicate:     true,
          },
        };

      case LuaBetResult.ROUND_INACTIVE:
        throw new BadRequestException({
          success: false,
          error: { code: 'BET_005', message: 'Round is not active' },
        });

      default:
        throw new InternalServerErrorException('Unexpected Lua script result');
    }

    const newBalance = parseFloat(luaResult.newBalance);

    // ── 8. Return response immediately ───────────────────────────────
    // DB persistence happens in background via EventProcessorWorker.
    return {
      success: true,
      data: {
        betId:         eventId, // Real Bet.id assigned by worker after DB insert
        status:        'ACTIVE',
        balanceBefore: parseFloat(balanceBefore),
        balanceAfter:  newBalance,
        timestamp:     new Date(ts),
        // mobile is not needed here — remove if frontend doesn't use it
      },
    };
  }

  // ─────────────────────────────────────────────
  // Read-only methods (unchanged from original)
  // ─────────────────────────────────────────────

  async getHistory(userId: string, page: number, limit: number) {
    const bets = await this.prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        round: {
          select: {
            roundNumber:   true,
            openingResult: true,
            openingType:   true,
            status:        true,
          },
        },
      },
    });

    const total = await this.prisma.bet.count({ where: { userId } });

    return {
      success: true,
      data: {
        items: bets,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllBets(
    page: number,
    limit: number,
    filters: { status?: string; type?: string; userId?: string } = {},
  ) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;

    if (filters.status && Object.values(BetStatus).includes(filters.status as BetStatus)) {
      where.status = filters.status as BetStatus;
    }
    if (filters.type && Object.values(BetType).includes(filters.type as BetType)) {
      where.betType = filters.type as BetType;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, mobile: true, username: true } },
          round: { select: { id: true, roundNumber: true, status: true } },
        },
      }),
      this.prisma.bet.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getRoundBets(roundId: string) {
    const bets = await this.prisma.bet.findMany({
      where: { roundId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, mobile: true, username: true } },
      },
    });
    return { success: true, data: bets };
  }

  async getCurrentRoundBets(userId: string) {
    // ── Step 1: Get active round from Redis (no DB query) ───────────
    const activeRoundId = await this.eventStream.getActiveRound();

    if (!activeRoundId) {
      return { success: true, data: { userBets: [], totalStake: 0 } };
    }

    // ── Step 2: Read ALL bet events from Redis stream for this round ─
    // This includes in-flight bets not yet persisted to Postgres.
    // Typical lag to Postgres is 100ms. This eliminates the "missing bet" UX bug.
    // RedisKeys and EventType are already imported at the top of this file
    const streamKey  = RedisKeys.roundBetsStream(activeRoundId);
    const allEntries = await this.eventStream.readAllEvents(streamKey);

    const userBetsFromStream = allEntries
      .map(e => { try { return JSON.parse(e.data); } catch { return null; } })
      .filter(e => e !== null && e.type === EventType.BET_PLACED && e.userId === userId);

    // ── Step 3: Build response in the same shape as Postgres bets ───
    const totalStake = userBetsFromStream.reduce(
      (acc, bet) => acc + parseFloat(bet.totalDeducted || '0'),
      0
    );

    // Get round metadata for the response
    const roundInfo = await this.prisma.gameRound.findUnique({
      where: { id: activeRoundId },
      select: { id: true, roundNumber: true, startedAt: true },
    });

    return {
      success: true,
      data: {
        roundId:     activeRoundId,
        roundNumber: roundInfo?.roundNumber,
        startedAt:   roundInfo?.startedAt,
        userBets:    userBetsFromStream.map(bet => ({
          id:        bet.eventId,
          userId:    bet.userId,
          roundId:   bet.roundId,
          betType:   bet.betType,
          numbers:   bet.numbers,
          amount:    parseFloat(bet.amount),
          status:    'ACTIVE',
          createdAt: new Date(bet.ts),
        })),
        totalStake,
      },
    };
  }
}

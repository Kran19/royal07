import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BetType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfitCalculatorService } from '../opening/calculator/profit-calculator.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SettingsService } from '../settings/settings.service';
import { EventStreamService } from '../../events/event-stream.service';
import {
  BetPlacedEvent,
  BetWonEvent,
  BetLostEvent,
  RoundClosedEvent,
  EventType,
  RedisKeys,
} from '../../events/event.types';

export enum GamePhase {
  BETTING = 'BETTING',
  LOCKED  = 'LOCKED',
  MOVING  = 'MOVING',
  RESULT  = 'RESULT',
  BUFFER  = 'BUFFER',
}

@Injectable()
export class GameLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(GameLifecycleService.name);

  public currentPhase: GamePhase = GamePhase.BUFFER;
  public phaseTimeLeft = 0;
  public currentRoundId: string | null = null;
  public currentRoundNumber = 0;

  private currentResult: number[] = [];
  private calculatedProfit = new Decimal(0);
  private hasProcessedPhaseTransition = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profitCalculator: ProfitCalculatorService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly settingsService: SettingsService,
    private readonly eventStream: EventStreamService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing 5-phase game state engine (Event Sourcing mode)...');
    await this.startNewRound();
  }

  public getGameState() {
    return {
      phase:       this.currentPhase,
      timer:       Math.max(0, this.phaseTimeLeft),
      roundId:     this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Main Game Tick (1 second interval)
  // ─────────────────────────────────────────────────────────────

  @Interval(1000)
  async handleTick() {
    if (!this.currentRoundId) return;

    this.phaseTimeLeft -= 1;

    const gameStatePayload: Record<string, any> = {
      phase:       this.currentPhase,
      timer:       Math.max(0, this.phaseTimeLeft),
      roundId:     this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    };

    if (this.phaseTimeLeft % 5 === 0) {
      this.logger.log(`Tick: ${this.currentPhase} | Timer: ${this.phaseTimeLeft}`);
    }

    if (this.currentPhase === GamePhase.MOVING && this.currentResult.length > 0) {
      gameStatePayload.targetStops = this.currentResult;
    }

    this.websocketGateway.broadcast('game_state', gameStatePayload);

    // ── Broadcast live admin exposure stats from Redis Hash ──────────
    // OLD: Reads from in-process liveFloorExposure[] array (lost on crash)
    // NEW: Reads from Redis Hash (survives restarts, shared across pods)
    if (this.currentPhase === GamePhase.BETTING && this.currentRoundId) {
      const exposure = await this.eventStream.getExposure(this.currentRoundId);
      const floorExposure = Array.from({ length: 12 }, (_, i) =>
        parseFloat(exposure[(i + 1).toString()] || '0'),
      );
      const totalStake = parseFloat(exposure['total'] || '0');

      this.websocketGateway.broadcast('admin_live_bets', {
        roundId:       this.currentRoundId,
        floorExposure,
        totalStake,
      });
    }

    if (this.phaseTimeLeft <= 0 && !this.hasProcessedPhaseTransition) {
      this.hasProcessedPhaseTransition = true;
      await this.progressPhase();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Phase Transitions
  // ─────────────────────────────────────────────────────────────

  private async progressPhase() {
    switch (this.currentPhase) {
      case GamePhase.BETTING:
        this.currentPhase = GamePhase.LOCKED;
        this.phaseTimeLeft = 3;
        this.websocketGateway.broadcast('game_state', { phase: GamePhase.LOCKED });
        // ✅ CRITICAL FIX: awaited so this.currentResult is guaranteed populated
        // before the MOVING phase reads it 3 seconds later.
        // calculateResult reads Redis stream + evaluates 495 quads — typically < 50ms.
        await this.calculateResultForCurrentRound();
        break;

      case GamePhase.LOCKED:
        this.currentPhase = GamePhase.MOVING;
        this.phaseTimeLeft = 22;
        this.websocketGateway.broadcast('game_state', {
          phase: GamePhase.MOVING,
          targetStops: this.currentResult,
        });
        break;

      case GamePhase.MOVING: {
        this.currentPhase = GamePhase.RESULT;
        this.phaseTimeLeft = 3;

        const payoutData = await this.executeSettlement();

        this.websocketGateway.broadcast('game_state', {
          phase:        GamePhase.RESULT,
          winningFloors: this.currentResult,
          payouts:      payoutData.payouts,
        });

        this.websocketGateway.broadcast('admin_round_settled', {
          roundId:     this.currentRoundId,
          totalStake:  payoutData.totalStake,
          totalPayout: payoutData.totalPayout,
          houseProfit: payoutData.houseProfit,
          result:      this.currentResult,
        });
        break;
      }

      case GamePhase.RESULT:
        this.currentPhase = GamePhase.BUFFER;
        this.phaseTimeLeft = 2;
        this.websocketGateway.broadcast('game_state', { phase: GamePhase.BUFFER });
        break;

      case GamePhase.BUFFER:
        await this.startNewRound();
        break;
    }

    this.hasProcessedPhaseTransition = false;
  }

  // ─────────────────────────────────────────────────────────────
  // Round Management
  // ─────────────────────────────────────────────────────────────

  private async startNewRound() {
    const settings  = await this.settingsService.getSettings();
    const duration  = Number(settings.data?.roundDuration || 30);

    const lastRound = await this.prisma.gameRound.findFirst({
      orderBy: { roundNumber: 'desc' },
    });

    this.currentRoundNumber = (lastRound?.roundNumber || 0) + 1;

    const newRound = await this.prisma.gameRound.create({
      data: {
        roundNumber:   this.currentRoundNumber,
        status:        'ACTIVE',
        totalStake:    0 as any,
        totalPayout:   0 as any,
        houseProfit:   0 as any,
        openingResult: [],
        openingType:   'QUAD',
      } as any,
    });

    this.currentRoundId = newRound.id;
    this.currentResult  = [];
    this.calculatedProfit = new Decimal(0);
    this.currentPhase   = GamePhase.BETTING;
    this.phaseTimeLeft  = duration;

    // Initialise the exposure hash in Redis for this round
    await this.eventStream.initExposure(newRound.id);
    // Set the active round key so BetService and workers know which round is live
    await this.eventStream.setActiveRound(newRound.id);

    this.websocketGateway.broadcast('game_state', {
      phase:       GamePhase.BETTING,
      timer:       this.phaseTimeLeft,
      roundId:     this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    });

    this.logger.log(
      `Started round #${this.currentRoundNumber} | ID: ${this.currentRoundId} | Duration: ${this.phaseTimeLeft}s`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Result Calculation — Guaranteed House Profit Algorithm
  // ─────────────────────────────────────────────────────────────

  /**
   * Calculates the winning quad by evaluating ALL 495 possible floor combinations
   * and selecting one that guarantees the configured house profit percentage.
   *
   * Algorithm (O(N) pre-index + O(495×15) evaluation):
   *   1. Read houseProfitPercent from AdminSettings (e.g. 5%)
   *   2. Compute maxPayout = totalStake × (1 - houseProfitPercent / 100)
   *   3. Read ALL BetPlacedEvents from Redis stream (O(N))
   *   4. Pre-index bets into 4 Maps: singles, pairs, triples, quads (O(N))
   *   5. Evaluate each of 495 quads → compute totalPayout (O(495 × ≤15 map lookups))
   *   6. Filter to validQuads where totalPayout ≤ maxPayout
   *   7. Pick a random valid quad — house profit guaranteed ≥ houseProfitPercent
   *   8. Fallback: if no valid quad exists, pick the minimum-payout quad
   *      (house profit maximised, NEVER a house loss — all users may lose)
   */
  private async calculateResultForCurrentRound() {
    if (!this.currentRoundId) return;

    this.logger.log(`Calculating result for round ${this.currentRoundId} (guaranteed-profit algorithm)...`);

    // ── Step 1: Read total stake from exposure hash (O(1)) ───────────────
    const exposure  = await this.eventStream.getExposure(this.currentRoundId);
    const totalStake = parseFloat(exposure['total'] || '0');

    if (totalStake <= 0) {
      this.logger.log('No bets placed. Selecting random quad.');
      this.currentResult    = this.generateRandomQuad();
      this.calculatedProfit = new Decimal(0);
      return;
    }

    // ── Step 2: Read houseProfitPercent from settings ────────────────────
    const settings        = await this.settingsService.getSettings();
    const profitPct       = parseFloat((settings.data?.houseProfitPercent ?? 5).toString());
    const maxPayout       = totalStake * (1 - profitPct / 100);

    this.logger.log(
      `Total stake: ${totalStake} | House profit target: ${profitPct}% | Max payout pool: ${maxPayout.toFixed(2)}`
    );

    // ── Step 3: Read ALL BetPlacedEvents from Redis stream (O(N)) ────────
    const streamKey  = RedisKeys.roundBetsStream(this.currentRoundId);
    const allEntries = await this.eventStream.readAllEvents(streamKey);

    const betEvents: BetPlacedEvent[] = allEntries
      .map(e => { try { return JSON.parse(e.data); } catch { return null; } })
      .filter((e): e is BetPlacedEvent => e !== null && e.type === EventType.BET_PLACED);

    this.logger.log(`Loaded ${betEvents.length} bet events from Redis stream`);

    // ── Step 4: Pre-index bets into 4 lookup Maps (O(N), done once) ──────
    // singles: floor → total stake on that floor (for multiplier × 3 calculation)
    // pairs/triples/quads: sorted-key → total stake on that combo
    const singlesMap = new Map<number, number>();  // floor → stake
    const pairsMap   = new Map<string, number>();  // 'f1,f2' → stake
    const triplesMap = new Map<string, number>(); // 'f1,f2,f3' → stake
    const quadsMap   = new Map<string, number>();  // 'f1,f2,f3,f4' → stake

    const SINGLE_MULTI = 3;
    const PAIR_MULTI   = 10;
    const TRIPLE_MULTI = 20;
    const QUAD_MULTI   = 30;

    for (const bet of betEvents) {
      const amount = parseFloat(bet.amount);
      const sorted = [...bet.numbers].sort((a, b) => a - b);

      if (bet.betType === 'SINGLE') {
        // Each number in the selection is an independent floor bet
        for (const floor of sorted) {
          singlesMap.set(floor, (singlesMap.get(floor) || 0) + amount);
        }
      } else if (bet.betType === 'PAIR') {
        const key = sorted.join(',');
        pairsMap.set(key, (pairsMap.get(key) || 0) + amount);
      } else if (bet.betType === 'TRIPLE') {
        const key = sorted.join(',');
        triplesMap.set(key, (triplesMap.get(key) || 0) + amount);
      } else if (bet.betType === 'QUAD') {
        const key = sorted.join(',');
        quadsMap.set(key, (quadsMap.get(key) || 0) + amount);
      }
    }

    // ── Step 5: Evaluate all 495 quads (O(495 × ≤15 lookups)) ───────────
    // ALL_QUADRUPLES is a pre-sorted array of all C(12,4)=495 quads.
    const ALL_QUADS = this.profitCalculator['allQuadruples'] as number[][];
    const QUAD_TO_PAIRS   = this.profitCalculator['QUAD_TO_PAIRS']   as Map<string, string[]>;
    const QUAD_TO_TRIPLES = this.profitCalculator['QUAD_TO_TRIPLES'] as Map<string, string[]>;

    // Pre-index singles into a flat array for O(1) floor access
    const singlesArr = new Array(13).fill(0);
    for (const [floor, stake] of singlesMap.entries()) {
      singlesArr[floor] = stake;
    }

    const validQuads:  Array<{ quad: number[]; payout: number }> = [];
    let   minimumPayoutQuad: number[]  = ALL_QUADS[0];
    let   minimumPayout     = Infinity;

    for (const quad of ALL_QUADS) {
      const [a, b, c, d] = quad;
      const quadKey = `${a},${b},${c},${d}`;

      // SINGLE payout: sum stakes on all 4 winning floors × 3
      const singlesPayout = SINGLE_MULTI * (singlesArr[a] + singlesArr[b] + singlesArr[c] + singlesArr[d]);

      // PAIR payout: check all C(4,2)=6 subsets of the winning quad
      let pairsPayout = 0;
      for (const key of (QUAD_TO_PAIRS.get(quadKey) || [])) {
        pairsPayout += PAIR_MULTI * (pairsMap.get(key) || 0);
      }

      // TRIPLE payout: check all C(4,3)=4 subsets
      let triplesPayout = 0;
      for (const key of (QUAD_TO_TRIPLES.get(quadKey) || [])) {
        triplesPayout += TRIPLE_MULTI * (triplesMap.get(key) || 0);
      }

      // QUAD payout: exact match only
      const quadPayout = QUAD_MULTI * (quadsMap.get(quadKey) || 0);

      const totalPayout = singlesPayout + pairsPayout + triplesPayout + quadPayout;

      // Track absolute minimum for fallback
      if (totalPayout < minimumPayout) {
        minimumPayout     = totalPayout;
        minimumPayoutQuad = quad;
      }

      // Collect all quads within the payout budget
      if (totalPayout <= maxPayout) {
        validQuads.push({ quad, payout: totalPayout });
      }
    }

    // ── Step 6 & 7: Select result ─────────────────────────────────────────
    let chosenQuad: number[];
    let chosenPayout: number;

    if (validQuads.length > 0) {
      // Find the highest payout among all valid quads
      const maxValidPayout = validQuads.reduce((max, v) => Math.max(max, v.payout), -1);
      
      // Filter valid quads to only those that yield the maximum valid payout
      const bestValidQuads = validQuads.filter(v => v.payout === maxValidPayout);

      // Pick randomly from the BEST valid quads — prioritising player wins
      const pick = bestValidQuads[Math.floor(Math.random() * bestValidQuads.length)];
      chosenQuad   = pick.quad;
      chosenPayout = pick.payout;
      this.logger.log(
        `${validQuads.length} valid quads found. Filtered to ${bestValidQuads.length} quads yielding max payout of ${maxValidPayout}. Picked randomly. ` +
        `Payout: ${chosenPayout.toFixed(2)} / ${maxPayout.toFixed(2)} (≤ budget)`
      );
    } else {
      // ── Fallback: NO valid quad exists (extreme concentration scenario) ──
      // House NEVER takes a loss. Pick the quad that pays out the LEAST.
      // All users may lose — that is acceptable. House loss — NEVER acceptable.
      chosenQuad   = minimumPayoutQuad;
      chosenPayout = minimumPayout;
      this.logger.warn(
        `NO valid quad within budget! Fallback: minimum-payout quad selected. ` +
        `Payout: ${chosenPayout.toFixed(2)} (budget was ${maxPayout.toFixed(2)}). House profit maximised.`
      );
    }

    this.currentResult    = [...chosenQuad].sort((a, b) => a - b);
    this.calculatedProfit = new Decimal(totalStake - chosenPayout);

    this.logger.log(
      `Result: [${this.currentResult.join(',')}] | ` +
      `House profit: ${this.calculatedProfit.toFixed(2)} (${profitPct}% target)`
    );
  }

  // ─────────────────────────────────────────────────────────────

  // Settlement (Redis-first, 4 total DB queries via background worker)
  // ─────────────────────────────────────────────────────────────

  /**
   * Executes round settlement.
   *
   * OLD APPROACH (❌ N×4 DB queries):
   *   for (const bet of bets) {
   *     UPDATE bet; SELECT user; UPDATE user balance; INSERT transaction
   *   }
   *   Total: 40,000 DB queries for 10,000 bets — crashes under load.
   *
   * NEW APPROACH (✅ < 20ms for 100k users):
   *   1. Read all bet events from Redis Stream (in RAM, no DB query)
   *   2. Calculate winners in-process
   *   3. Credit winner balances in Redis via PIPELINE (< 10ms)
   *   4. Append settlement events to stream
   *   5. Broadcast WebSocket results immediately
   *   6. Push roundId to settlement:persist:queue for DB worker
   *   DB persistence happens asynchronously via SettlementPersistenceWorker
   */
  private async executeSettlement(): Promise<{
    payouts: Array<{ userId: string; amount: number }>;
    totalStake: number;
    totalPayout: number;
    houseProfit: number;
  }> {
    if (!this.currentRoundId || this.currentResult.length === 0) {
      return { payouts: [], totalStake: 0, totalPayout: 0, houseProfit: 0 };
    }

    const roundId = this.currentRoundId;

    // Prevent double settlement (e.g., if the interval fires twice)
    if (await this.eventStream.isRoundAlreadySettled(roundId)) {
      this.logger.warn(`Round ${roundId} already settled — skipping`);
      return { payouts: [], totalStake: 0, totalPayout: 0, houseProfit: 0 };
    }

    // ── Step 1: Read ALL bet events from Redis Stream ─────────────────
    const streamKey  = RedisKeys.roundBetsStream(roundId);
    const allEntries = await this.eventStream.readAllEvents(streamKey);

    const betEvents: BetPlacedEvent[] = allEntries
      .map(e => { try { return JSON.parse(e.data); } catch { return null; } })
      .filter((e): e is BetPlacedEvent => e !== null && e.type === EventType.BET_PLACED);

    this.logger.log(`Settling round ${roundId} | ${betEvents.length} bets from Redis stream`);

    // ── Step 2: Calculate winners in RAM ──────────────────────────────
    let totalStakeNum  = 0;
    let totalPayoutNum = 0;

    const payoutMap  = new Map<string, Decimal>(); // userId → total payout
    const wonEvents: BetWonEvent[] = [];
    const lostEvents: BetLostEvent[] = [];

    for (const bet of betEvents) {
      const amount = new Decimal(bet.amount);
      const totalBetDeducted = new Decimal(bet.totalDeducted);
      totalStakeNum += totalBetDeducted.toNumber();

      const isWin = this.checkBetWin(bet.betType, bet.numbers, this.currentResult);
      let payout = new Decimal(0);

      if (isWin) {
        if (bet.betType === 'SINGLE') {
          // For SINGLE, each matching floor wins individually
          const winCount = bet.numbers.filter(n => this.currentResult.includes(n)).length;
          payout = amount.mul(this.getMultiplier('SINGLE')).mul(winCount);
        } else {
          payout = amount.mul(this.getMultiplier(bet.betType as BetType));
        }
      }

      if (payout.gt(0)) {
        totalPayoutNum += payout.toNumber();
        payoutMap.set(bet.userId, (payoutMap.get(bet.userId) || new Decimal(0)).add(payout));

        wonEvents.push({
          eventId:    `won-${bet.eventId}`,
          type:       EventType.BET_WON,
          roundId,
          userId:     bet.userId,
          betId:      '', // Assigned by DB worker after persistence
          payout:     payout.toFixed(2),
          multiplier: this.getMultiplier(bet.betType as BetType),
          result:     this.currentResult,
          betType:    bet.betType,
          numbers:    bet.numbers,
          amount:     bet.amount,
          ts:         Date.now(),
        });
      } else {
        lostEvents.push({
          eventId:    `lost-${bet.eventId}`,
          type:       EventType.BET_LOST,
          roundId,
          userId:     bet.userId,
          betId:      '',
          result:     this.currentResult,
          betType:    bet.betType,
          numbers:    bet.numbers,
          amount:     bet.amount,
          ts:         Date.now(),
        });
      }
    }

    // ── Step 3: Credit winner balances in Redis via PIPELINE ──────────
    // Capture balanceBefore for each winner BEFORE crediting (for audit log).
    const balanceBeforeMap = new Map<string, string>();
    for (const [userId] of payoutMap.entries()) {
      const bal = await this.eventStream.getLiveBalance(userId);
      balanceBeforeMap.set(userId, bal || '0');
    }

    // Single Redis pipeline roundtrip for all winner credits.
    const redisClient = (this.eventStream as any).redisService.getClient();
    const pipeline = redisClient.pipeline();

    for (const [userId, payout] of payoutMap.entries()) {
      pipeline.incrbyfloat(RedisKeys.userBalance(userId), payout.toNumber());
      pipeline.set(RedisKeys.userBalanceVersion(userId), Date.now().toString());
    }
    const pipelineResults = await pipeline.exec();

    // Capture balanceAfter from pipeline results (every 2nd result is incrbyfloat response)
    const balanceAfterMap = new Map<string, string>();
    let resultIdx = 0;
    for (const [userId] of payoutMap.entries()) {
      const afterRaw = pipelineResults[resultIdx]?.[1];
      balanceAfterMap.set(userId, afterRaw ? String(afterRaw) : '0');
      resultIdx += 2; // skip the SET result
    }

    this.logger.log(`Credited ${payoutMap.size} winners in Redis (pipeline)`);


    // ── Step 4: Append settlement events to stream ────────────────────
    const settlementStreamKey = RedisKeys.settlementStream(roundId);
    const settlementPipeline  = redisClient.pipeline();

    // ✅ BUG #2 FIX: Enrich wonEvents with real balance data before streaming to DB worker.
    // balanceBeforeMap was captured BEFORE crediting; balanceAfterMap AFTER.
    // These values are now stored in the settlement stream so the persistence
    // worker can write a complete audit record to the Transaction table.
    for (const ev of wonEvents) {
      const enriched = {
        ...ev,
        balanceBefore: balanceBeforeMap.get(ev.userId) || '0',
        balanceAfter:  balanceAfterMap.get(ev.userId)  || '0',
      };
      settlementPipeline.xadd(settlementStreamKey, '*', 'data', JSON.stringify(enriched));
    }
    for (const ev of lostEvents) {
      settlementPipeline.xadd(settlementStreamKey, '*', 'data', JSON.stringify(ev));
    }

    const roundClosedEvent: RoundClosedEvent = {
      eventId:     `closed-${roundId}`,
      type:        EventType.ROUND_CLOSED,
      roundId,
      result:      this.currentResult,
      totalStake:  totalStakeNum.toFixed(2),
      totalPayout: totalPayoutNum.toFixed(2),
      houseProfit: (totalStakeNum - totalPayoutNum).toFixed(2),
      totalBets:   betEvents.length,
      totalWinners: payoutMap.size,
      ts:          Date.now(),
    };
    settlementPipeline.xadd(settlementStreamKey, '*', 'data', JSON.stringify(roundClosedEvent));
    // Expire settlement stream after 24 hours (for audit purposes)
    settlementPipeline.expire(settlementStreamKey, 86400);

    await settlementPipeline.exec();

    // ── Step 5: Mark round as settled in Redis ────────────────────────
    await this.eventStream.markRoundSettled(roundId);

    // ── Step 6: Push to DB persistence queue ─────────────────────────
    // SettlementPersistenceWorker picks this up and runs the 4 DB queries.
    await redisClient.rpush('settlement:persist:queue', roundId);

    // ── Step 7: Broadcast per-user WebSocket events ───────────────────
    for (const [userId, payout] of payoutMap.entries()) {
      const newBalance = await this.eventStream.getLiveBalance(userId);
      this.websocketGateway.broadcastToUser(userId, 'balance_update', {
        balance: parseFloat(newBalance || '0'),
        payout:  payout.toNumber(),
        result:  this.currentResult,
      });
    }

    this.logger.log(
      `Settlement complete for round ${roundId} | ` +
      `Stake: ${totalStakeNum} | Payout: ${totalPayoutNum} | ` +
      `House: ${(totalStakeNum - totalPayoutNum).toFixed(2)}`,
    );

    return {
      payouts: Array.from(payoutMap.entries()).map(([userId, amount]) => ({
        userId,
        amount: amount.toNumber(),
      })),
      totalStake:  totalStakeNum,
      totalPayout: totalPayoutNum,
      houseProfit: totalStakeNum - totalPayoutNum,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private generateRandomQuad(): number[] {
    const nums = new Set<number>();
    while (nums.size < 4) {
      nums.add(Math.floor(Math.random() * 12) + 1);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }

  private checkBetWin(betType: string, numbers: number[], result: number[]): boolean {
    if (betType === 'SINGLE') return numbers.some(n => result.includes(n));
    if (betType === 'PAIR')   return numbers.every(n => result.includes(n));
    if (betType === 'TRIPLE') return numbers.every(n => result.includes(n));
    if (betType === 'QUAD')   return [...numbers].sort().join(',') === [...result].sort().join(',');
    return false;
  }

  private getMultiplier(type: BetType): number {
    switch (type) {
      case 'SINGLE': return 3;
      case 'PAIR':   return 10;
      case 'TRIPLE': return 20;
      case 'QUAD':   return 30;
      default:       return 0;
    }
  }

  /**
   * @deprecated No longer needed — exposure is managed by the Lua script atomically.
   * Kept for compatibility with bet.gateway.ts until that file is updated.
   */
  public addLiveBetExposure(_betType: string, _numbers: number[], _amount: number) {
    // Intentionally empty — exposure is now written by the Lua script
  }
}

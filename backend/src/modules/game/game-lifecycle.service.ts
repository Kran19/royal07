import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BetType, BetStatus, RoundStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfitCalculatorService } from '../opening/calculator/profit-calculator.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SettingsService } from '../settings/settings.service';

export enum GamePhase {
  BETTING = 'BETTING',
  LOCKED = 'LOCKED',
  MOVING = 'MOVING',
  RESULT = 'RESULT',
  BUFFER = 'BUFFER',
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

  public liveFloorExposure: Decimal[] = new Array(12).fill(new Decimal(0));
  public currentTotalStake = new Decimal(0);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profitCalculator: ProfitCalculatorService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing 5-phase game state engine...');
    await this.startNewRound();
  }

  public getGameState() {
    return {
      phase: this.currentPhase,
      timer: Math.max(0, this.phaseTimeLeft),
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    };
  }

  @Interval(1000)
  async handleTick() {
    if (!this.currentRoundId) return;

    this.phaseTimeLeft -= 1;

    const gameStatePayload: Record<string, any> = {
      phase: this.currentPhase,
      timer: Math.max(0, this.phaseTimeLeft),
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    };

    if (this.phaseTimeLeft % 5 === 0) {
      this.logger.log(`Tick: ${this.currentPhase} | Timer: ${this.phaseTimeLeft}`);
    }

    if (this.currentPhase === GamePhase.MOVING && this.currentResult.length > 0) {
      gameStatePayload.targetStops = this.currentResult;
    }

    this.websocketGateway.broadcast('game_state', gameStatePayload);

    this.websocketGateway.broadcast('admin_live_bets', {
      roundId: this.currentRoundId,
      floorExposure: this.liveFloorExposure.map(e => (e as any).toNumber()),
      totalStake: (this.currentTotalStake as any).toNumber(),
    });

    if (this.phaseTimeLeft <= 0 && !this.hasProcessedPhaseTransition) {
      this.hasProcessedPhaseTransition = true;
      await this.progressPhase();
    }
  }

  private async progressPhase() {
    switch (this.currentPhase) {
      case GamePhase.BETTING:
        this.currentPhase = GamePhase.LOCKED;
        this.phaseTimeLeft = 3;
        this.websocketGateway.broadcast('game_state', { phase: GamePhase.LOCKED });
        this.calculateResultForCurrentRound().catch((error) => this.logger.error(error));
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
          phase: GamePhase.RESULT,
          winningFloors: this.currentResult,
          payouts: payoutData.payouts,
        });

        this.websocketGateway.broadcast('admin_round_settled', {
          roundId: this.currentRoundId,
          totalStake: (payoutData.totalStake as any).toNumber(),
          totalPayout: (payoutData.totalPayout as any).toNumber(),
          houseProfit: (payoutData.houseProfit as any).toNumber(),
          result: this.currentResult,
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

  private async startNewRound() {
    const settings = await this.settingsService.getSettings();
    const duration = Number(settings.data?.roundDuration || 30);

    const lastRound = await this.prisma.gameRound.findFirst({
      orderBy: { roundNumber: 'desc' },
    });

    this.currentRoundNumber = (lastRound?.roundNumber || 0) + 1;

    const newRound = await this.prisma.gameRound.create({
      data: {
        roundNumber: this.currentRoundNumber,
        status: 'ACTIVE',
        totalStake: 0 as any,
        totalPayout: 0 as any,
        houseProfit: 0 as any,
        openingResult: [],
        openingType: 'QUAD',
      } as any,
    });

    this.currentRoundId = newRound.id;
    this.currentResult = [];
    this.calculatedProfit = new Decimal(0);
    this.liveFloorExposure = new Array(12).fill(new Decimal(0));
    this.currentTotalStake = new Decimal(0);
    this.currentPhase = GamePhase.BETTING;
    this.phaseTimeLeft = duration;

    this.websocketGateway.broadcast('game_state', {
      phase: GamePhase.BETTING,
      timer: this.phaseTimeLeft,
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
    });

    this.logger.log(`Started round #${this.currentRoundNumber} | ID: ${this.currentRoundId} | Duration: ${this.phaseTimeLeft}s`);
  }

  private async calculateResultForCurrentRound() {
    if (!this.currentRoundId) return;

    this.logger.log(`Calculating result for round ${this.currentRoundId}...`);

    const bets = await this.prisma.bet.findMany({
      where: { roundId: this.currentRoundId, status: 'ACTIVE' },
    });

    const aggStats = this.aggregateBetsForSettlement(bets);

    if (aggStats.totalStake <= 0) {
      this.logger.log('No bets placed. Selecting random quad.');
      this.currentResult = this.generateRandomQuad();
      this.calculatedProfit = new Decimal(0);
      return;
    }

    const calculation = this.profitCalculator.calculateAllQuadProfits(aggStats);
    const bestOpening = calculation.results[0];

    if (!bestOpening) {
      this.currentResult = this.generateRandomQuad();
      this.calculatedProfit = new Decimal(0);
      return;
    }

    this.currentResult = [...bestOpening.opening].sort((a, b) => a - b);
    this.calculatedProfit = new Decimal(bestOpening.profit);

    this.logger.log(`Result calculated: [${this.currentResult.join(',')}] | Projected profit: ${(this.calculatedProfit as any).toNumber()}`);
  }

  private async executeSettlement() {
    if (!this.currentRoundId || this.currentResult.length === 0) {
      return { payouts: [], totalStake: new Decimal(0), totalPayout: new Decimal(0), houseProfit: new Decimal(0) };
    }

    const roundId = this.currentRoundId;
    const bets = await this.prisma.bet.findMany({
      where: { roundId, status: 'ACTIVE' },
    });

    let totalStake = new Decimal(0);
    let totalPayout = new Decimal(0);
    const payoutMap = new Map<string, Decimal>();

    await this.prisma.$transaction(async (tx) => {
      for (const bet of bets) {
        const betAmount = bet.amount as any;
        let payout = new Decimal(0);
        let winNumbers: number[] = [];

        if (bet.betType === 'SINGLE') {
          const numFloors = bet.numbers.length;
          const currentStake = betAmount.mul(numFloors);
          totalStake = totalStake.add(currentStake);

          winNumbers = bet.numbers.filter((n: number) => this.currentResult.includes(n));
          if (winNumbers.length > 0) {
            payout = betAmount.mul(this.getMultiplier(BetType.SINGLE)).mul(winNumbers.length);
          }
        } else {
          totalStake = totalStake.add(betAmount);
          const isWinner = this.checkBetWin(bet, this.currentResult);
          if (isWinner) {
            payout = betAmount.mul(this.getMultiplier(bet.betType as BetType));
          }
        }

        // Update Bet record
        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: 'SETTLED',
            settlementAmount: payout as any, // Cast to any to bypass Prisma/TS lag on Decimal fields
            payoutMultiplier: payout.gt(0) ? this.getMultiplier(bet.betType as BetType) : 0,
          },
        });

        if (payout.gt(0)) {
          totalPayout = totalPayout.add(payout);
          payoutMap.set(bet.userId, (payoutMap.get(bet.userId) || new Decimal(0)).add(payout));

          // Credit user wallet with Optimistic Locking
          const user = await tx.user.findUnique({ where: { id: bet.userId } });
          if (user) {
            const updatedUser = await tx.user.update({
              where: { id: bet.userId, version: (user as any).version } as any,
              data: {
                balance: { increment: payout as any },
                totalWon: { increment: payout as any },
                version: { increment: 1 }
              } as any,
            });

            // Log transaction with actual balances
            await tx.transaction.create({
              data: {
                userId: bet.userId,
                type: 'BET_WON',
                amount: payout as any,
                balanceBefore: (user as any).balance as any,
                balanceAfter: (updatedUser as any).balance as any,
                status: 'COMPLETED',
                reference: bet.id,
              },
            });
          }
        }
      }

      // Settle the round record
      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          openingResult: this.currentResult,
          totalStake: totalStake as any,
          totalPayout: totalPayout as any,
          houseProfit: totalStake.sub(totalPayout) as any,
          status: 'SETTLED',
          endedAt: new Date(),
          version: { increment: 1 }
        } as any,
      });
    });

    // Broadcast results
    payoutMap.forEach((amount, userId) => {
      this.prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
        .then(user => {
          if (user) {
            this.websocketGateway.broadcastToUser(userId, 'balance_update', {
              balance: (user.balance as any).toNumber(),
              payout: (amount as any).toNumber(),
              result: this.currentResult,
            });
          }
        });
    });

    this.logger.log(`Settlement executed. Stake: ${totalStake}, Payout: ${totalPayout}`);

    return {
      payouts: Array.from(payoutMap.entries()).map(([userId, amount]) => ({ userId, amount: (amount as any).toNumber() })),
      totalStake,
      totalPayout,
      houseProfit: totalStake.sub(totalPayout),
    };
  }

  public addLiveBetExposure(betType: string, numbers: number[], amount: number) {
    if (this.currentPhase !== GamePhase.BETTING) return;
    const decimalAmount = new Decimal(amount);

    if (betType === 'SINGLE') {
      for (const num of numbers) {
        if (num >= 1 && num <= 12) {
          this.liveFloorExposure[num - 1] = this.liveFloorExposure[num - 1].add(decimalAmount);
          this.currentTotalStake = this.currentTotalStake.add(decimalAmount);
        }
      }
      return;
    }

    const perFloor = decimalAmount.div(numbers.length);
    for (const num of numbers) {
      if (num >= 1 && num <= 12) {
        this.liveFloorExposure[num - 1] = this.liveFloorExposure[num - 1].add(perFloor);
      }
    }
    this.currentTotalStake = this.currentTotalStake.add(decimalAmount);
  }

  private generateRandomQuad(): number[] {
    const nums = new Set<number>();
    while (nums.size < 4) {
      nums.add(Math.floor(Math.random() * 12) + 1);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }

  private aggregateBetsForSettlement(bets: any[]) {
    const singles = new Map<number, number>();
    const pairs = new Map<string, number>();
    const triples = new Map<string, number>();
    const quads = new Map<string, number>();
    let totalStake = new Decimal(0);

    for (const bet of bets) {
      const amount = new Decimal(bet.amount as any);

      if (bet.betType === 'SINGLE') {
        for (const num of bet.numbers) {
          totalStake = totalStake.add(amount);
          singles.set(num, (singles.get(num) || 0) + (amount as any).toNumber());
        }
      } else if (bet.betType === 'PAIR') {
        totalStake = totalStake.add(amount);
        const key = [...bet.numbers].sort((a, b) => a - b).join(',');
        pairs.set(key, (pairs.get(key) || 0) + (amount as any).toNumber());
      } else if (bet.betType === 'TRIPLE') {
        totalStake = totalStake.add(amount);
        const key = [...bet.numbers].sort((a, b) => a - b).join(',');
        triples.set(key, (triples.get(key) || 0) + (amount as any).toNumber());
      } else if (bet.betType === 'QUAD') {
        totalStake = totalStake.add(amount);
        const key = [...bet.numbers].sort((a, b) => a - b).join(',');
        quads.set(key, (quads.get(key) || 0) + (amount as any).toNumber());
      }
    }

    return {
      singles,
      pairs,
      triples,
      quads,
      totalStake: totalStake.toNumber(),
      totalBets: bets.length,
      uniqueUsers: 0,
    };
  }

  private checkBetWin(bet: any, result: number[]): boolean {
    const betNums = bet.numbers;
    if (bet.betType === 'SINGLE') return betNums.some((n: number) => result.includes(n));
    if (bet.betType === 'PAIR') return betNums.every((n: number) => result.includes(n));
    if (bet.betType === 'TRIPLE') return betNums.every((n: number) => result.includes(n));
    if (bet.betType === 'QUAD') return [...betNums].sort().join(',') === [...result].sort().join(',');
    return false;
  }

  private getMultiplier(type: BetType): number {
    switch (type) {
      case 'SINGLE': return 3;
      case 'PAIR': return 10;
      case 'TRIPLE': return 20;
      case 'QUAD': return 30;
      default: return 0;
    }
  }
}

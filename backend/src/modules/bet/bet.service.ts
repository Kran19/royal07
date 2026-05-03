import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { GameLifecycleService } from '../game/game-lifecycle.service';
import { BetStatus, BetType } from '@prisma/client';

@Injectable()
export class BetService {
  constructor(
    private prisma: PrismaService,
    private gameLifecycle: GameLifecycleService
  ) {}

  async placeBet(userId: string, dto: PlaceBetDto) {
    // 1. Get active round
    const round = await this.prisma.gameRound.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' }
    });

    if (!round) {
      throw new BadRequestException({ success: false, error: { code: 'BET_005', message: 'No active round found' } });
    }

    // 2. Wrap in transaction checking balance
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      
      const amount = new Decimal(dto.amount);
      const deductAmount = (dto.betType as string) === 'SINGLE'
        ? amount.mul(dto.numbers.length)
        : amount;

      if (!user || user.balance.lt(deductAmount) || deductAmount.lte(0)) {
        throw new BadRequestException({
          success: false,
          error: { 
            code: 'BET_001', 
            message: 'Insufficient balance', 
            details: { balance: (user as any)?.balance?.toNumber() || 0, required: deductAmount.toNumber() } 
          }
        });
      }

      // Deduct balance with Optimistic Locking
      const updatedUser = await tx.user.update({
        where: { 
          id: userId,
          version: (user as any).version
        } as any,
        data: { 
          balance: { decrement: deductAmount as any }, 
          totalBets: { increment: 1 },
          version: { increment: 1 }
        } as any
      });

      if (!updatedUser) {
        throw new ConflictException({ success: false, error: { message: 'Transaction conflict, please try again' } });
      }

      // Create bet
      const bet = await tx.bet.create({
        data: {
          userId,
          roundId: round.id,
          betType: dto.betType as BetType,
          numbers: dto.numbers,
          amount: amount as any,
          status: 'ACTIVE'
        }
      });

      // Insert transaction history
      await tx.transaction.create({
        data: {
          userId,
          type: 'BET_PLACED',
          amount: amount as any,
          balanceBefore: (user as any).balance as any,
          balanceAfter: (updatedUser as any).balance as any,
          status: 'COMPLETED',
          reference: bet.id
        }
      });

      // 🔥 Update live admin exposure stats immediately after the successful tx
      this.gameLifecycle.addLiveBetExposure(dto.betType, dto.numbers, dto.amount);

      return {
        success: true,
        data: {
          betId: bet.id,
          status: bet.status,
          balanceBefore: user.balance.toNumber(),
          balanceAfter: updatedUser.balance.toNumber(),
          timestamp: bet.createdAt,
          mobile: user.mobile
        }
      };
    });
  }

  async getHistory(userId: string, page: number, limit: number) {
    const bets = await this.prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { 
        round: { 
          select: { 
            roundNumber: true,
            openingResult: true,
            openingType: true,
            status: true
          } 
        } 
      }
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
      }
    };
  }

  async getAllBets(
    page: number,
    limit: number,
    filters: { status?: string; type?: string; userId?: string } = {},
  ) {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

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
          user: {
            select: {
              id: true,
              mobile: true,
              username: true,
            },
          },
          round: {
            select: {
              id: true,
              roundNumber: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.bet.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRoundBets(roundId: string) {
    const bets = await this.prisma.bet.findMany({
      where: { roundId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            username: true,
          },
        },
      },
    });

    return {
      success: true,
      data: bets,
    };
  }

  async getCurrentRoundBets(userId: string) {
    const round = await this.prisma.gameRound.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' }
    });

    if (!round) return { success: true, data: { userBets: [], totalStake: 0 } };

    const userBets = await this.prisma.bet.findMany({
      where: { roundId: round.id, userId, status: 'ACTIVE' }
    });

    return {
      success: true,
      data: {
        roundId: round.id,
        roundNumber: round.roundNumber,
        startedAt: round.startedAt,
        userBets,
        totalStake: userBets.reduce((acc, cur) => acc.add(cur.amount), new Decimal(0)).toNumber(),
      }
    };
  }
}

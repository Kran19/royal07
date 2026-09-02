import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async getCurrentRound(userId?: string) {
    const round = await this.prisma.gameRound.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' }
    });

    if (!round) {
      return { success: true, data: null };
    }

    // Calculate endsAt based on DB settings
    const settings = await this.settingsService.getSettings();
    const duration = settings.data?.roundDuration || 30;
    const endsAt = new Date(round.startedAt.getTime() + duration * 1000); 
    const timeRemaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));

    const activeBetsStats = await this.prisma.bet.aggregate({
      where: { roundId: round.id, status: 'ACTIVE' },
      _count: { id: true },
      _sum: { amount: true }
    });

    let userBets: any[] = [];
    if (userId) {
      userBets = await this.prisma.bet.findMany({
        where: { roundId: round.id, userId, status: 'ACTIVE' }
      });
    }

    return {
      success: true,
      data: {
        roundId: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        startedAt: round.startedAt,
        endsAt,
        timeRemaining,
        totalBets: activeBetsStats._count.id || 0,
        totalStake: activeBetsStats._sum.amount ? parseFloat(activeBetsStats._sum.amount.toString()) : 0,
        userBets
      }
    };
  }

  async getHistory(page: number, limit: number) {
    const rounds = await this.prisma.gameRound.findMany({
      where: { status: { in: ['SETTLED', 'CANCELLED'] } },
      orderBy: { endedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        roundNumber: true,
        status: true,
        openingResult: true,
        openingType: true,
        totalStake: true,
        totalPayout: true,
        houseProfit: true,
        startedAt: true,
        endedAt: true,
        _count: {
          select: { bets: true }
        }
      }
    });

    const total = await this.prisma.gameRound.count({
      where: { status: { in: ['SETTLED', 'CANCELLED'] } }
    });

    return {
      success: true,
      data: {
        items: rounds,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
  }
}

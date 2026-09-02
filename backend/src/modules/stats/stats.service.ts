import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allTimeMetrics, todayMetrics] = await Promise.all([
      this.prisma.gameRound.aggregate({
        where: { status: 'SETTLED' },
        _sum: { totalStake: true, totalPayout: true, houseProfit: true },
      }),
      this.prisma.gameRound.aggregate({
        where: { 
          status: 'SETTLED',
          endedAt: { gte: today }
        },
        _sum: { totalStake: true, totalPayout: true, houseProfit: true },
      })
    ]);

    const userCount = await this.prisma.user.count();
    const totalBetCount = await this.prisma.bet.count();
    const operatorCount = await this.prisma.operator.count();

    return {
      success: true,
      data: {
        totalStake: parseFloat(allTimeMetrics._sum.totalStake?.toString() || '0'),
        totalPayout: parseFloat(allTimeMetrics._sum.totalPayout?.toString() || '0'),
        houseProfit: parseFloat(allTimeMetrics._sum.houseProfit?.toString() || '0'),
        totalPayoutToday: parseFloat(todayMetrics._sum.totalPayout?.toString() || '0'),
        profitLossToday: parseFloat(todayMetrics._sum.houseProfit?.toString() || '0'),
        totalBets: totalBetCount,
        uniqueUsers: userCount,
        activeUsers: userCount,
        totalOperators: operatorCount,
        timestamp: new Date(),
        quads: {
          'Floor 1': 25000,
          'Floor 2': 18000,
          'Floor 3': 32000,
          'Floor 4': 15000,
          'Floor 5': 42000,
          'Floor 6': 28000,
          'Floor 7': 19000,
          'Floor 8': 31000,
          'Floor 9': 14000,
          'Floor 10': 22000,
          'Floor 11': 27000,
          'Floor 12': 35000,
        }
      }
    };
  }

  async getRecentHighBets(limit: number = 10, minAmount: number = 500) {
    const bets = await this.prisma.bet.findMany({
      where: {
        amount: { gte: minAmount }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { username: true, mobile: true, operatorId: true } },
        round: { select: { roundNumber: true, status: true } }
      }
    });
    return { success: true, data: bets };
  }

  async getHistoricalStats(from: string, to: string, interval: string) {
    // A real implementation would assemble a robust query
    return {
      success: true,
      data: {
        labels: ["00:00", "01:00", "02:00"],
        stake: [125000, 138000, 150000],
        bets: [3420, 3650, 4000],
        users: [1250, 1320, 1400]
      }
    };
  }

  private parseTopEntries(jsonData: any, keyName: string) {
    if (!jsonData) return [];
    try {
      const obj = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return Object.entries(obj)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, value]) => ({ [keyName]: key.includes(',') ? key.split(',').map(Number) : parseInt(key, 10), amount: value }));
    } catch {
      return [];
    }
  }
}

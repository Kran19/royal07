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
        timestamp: new Date(),
      }
    };
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

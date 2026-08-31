import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class B2bAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOperatorHealth(currency?: string) {
    // Note: Operator health (webhook latency) is server-wide, not currency-specific.
    const operators = await this.prisma.operator.findMany({
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100 // Look at last 100 transactions for health
        }
      }
    });

    return operators.map(op => {
      const txs = op.transactions;
      const total = txs.length;
      const successCount = txs.filter(t => t.status === 'SUCCESS').length;
      const pendingCount = txs.filter(t => t.status === 'PENDING').length;
      const failedCount = txs.filter(t => t.status === 'FAILED').length;
      
      const successRate = total > 0 ? (successCount / total) * 100 : 100;
      
      const successfulTxsWithTime = txs.filter(t => t.status === 'SUCCESS' && t.responseTimeMs !== null);
      const avgResponseTime = successfulTxsWithTime.length > 0 
        ? successfulTxsWithTime.reduce((acc, t) => acc + (t.responseTimeMs || 0), 0) / successfulTxsWithTime.length 
        : 0;

      return {
        id: op.id,
        operatorId: op.operatorId,
        name: op.name,
        successRate: Math.round(successRate * 100) / 100,
        pendingRetries: pendingCount,
        failedCount: failedCount,
        avgResponseTimeMs: Math.round(avgResponseTime)
      };
    });
  }

  async getOperatorGGR(currency?: string) {
    // Note: We're finding GGR by aggregating Bets joined with Users
    const operators = await this.prisma.operator.findMany({
      select: { id: true, operatorId: true, name: true }
    });

    const results: any[] = [];
    
    for (const op of operators) {
      // Find all bets for users of this operator
      const agg = await this.prisma.bet.aggregate({
        where: {
          user: { 
            operatorId: op.id,
            ...(currency ? { currency } : {})
          },
          status: 'SETTLED'
        },
        _sum: {
          amount: true,
          settlementAmount: true
        },
        _count: {
          id: true
        }
      });

      const totalStake = Number(agg._sum.amount || 0);
      const totalPayout = Number(agg._sum.settlementAmount || 0);
      const ggr = totalStake - totalPayout;

      results.push({
        id: op.id,
        operatorId: op.operatorId,
        name: op.name,
        totalBets: agg._count.id,
        totalVolume: totalStake,
        totalPayouts: totalPayout,
        netGGR: ggr
      });
    }

    // Sort by highest GGR
    return results.sort((a, b) => b.netGGR - a.netGGR);
  }

  async getSettlementSnapshot(currency?: string) {
    const ggrData = await this.getOperatorGGR(currency);
    return ggrData.map(data => {
      return {
        ...data,
        settlementOwed: data.netGGR
      };
    });
  }

  async getSystemAlerts() {
    return this.prisma.systemAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}

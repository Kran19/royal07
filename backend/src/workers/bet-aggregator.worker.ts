import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BetStatsRepository, BetStatsData } from '../modules/stats/stats.repository';
import { ProfitCalculatorService } from '../modules/opening/calculator/profit-calculator.service';
import { WebsocketGateway } from '../modules/websocket/websocket.gateway';
import { RedisService } from '../modules/redis/redis.service';

@Injectable()
export class BetAggregatorWorker {
  private readonly logger = new Logger(BetAggregatorWorker.name);
  private readonly CACHE_KEY = 'profitable_openings';
  private readonly CACHE_TTL = 5; // 5 seconds
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly betStatsRepository: BetStatsRepository,
    private readonly profitCalculator: ProfitCalculatorService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly redisService: RedisService,
  ) {}
  
  @Cron(CronExpression.EVERY_5_SECONDS)
  async aggregateAndCalculate() {
    const startTime = Date.now();
    
    try {
      // 1. Get active bets from last 30 seconds
      const since = new Date(Date.now() - 30000);
      
      // Use raw SQL for maximum performance
      const results = await this.prisma.$queryRaw`
        SELECT 
          "betType",
          numbers,
          SUM(amount) as total_amount,
          COUNT(*) as bet_count,
          "userId"
        FROM "Bet"
        WHERE "timestamp" >= ${since}
          AND status = 'ACTIVE'
        GROUP BY "betType", numbers, "userId"
      `;
      
      // 2. Process results into maps
      const singles = new Map<number, number>();
      const pairs = new Map<string, number>();
      const triples = new Map<string, number>();
      const quads = new Map<string, number>();
      let totalStake = 0;
      let totalBets = 0;
      const uniqueUsers = new Set<string>();
      
      for (const row of results as any[]) {
        const amount = parseFloat(row.total_amount);
        totalStake += amount;
        totalBets += parseInt(row.bet_count);
        uniqueUsers.add(row.userId);
        
        // Parse numbers array from PostgreSQL
        const numbers = row.numbers;
        const numbersKey = [...numbers].sort((a, b) => (a as number) - (b as number)).join(',');
        
        switch (row.betType) {
          case 'SINGLE':
            singles.set(numbers[0], (singles.get(numbers[0]) || 0) + amount);
            break;
          case 'PAIR':
            pairs.set(numbersKey, (pairs.get(numbersKey) || 0) + amount);
            break;
          case 'TRIPLE':
            triples.set(numbersKey, (triples.get(numbersKey) || 0) + amount);
            break;
          case 'QUAD':
            quads.set(numbersKey, (quads.get(numbersKey) || 0) + amount);
            break;
        }
      }
      
      // 3. Get current round
      const currentRound = await this.prisma.gameRound.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
      
      // 4. Save aggregated stats
      const betStats = {
        singles,
        pairs,
        triples,
        quads,
        totalStake,
        totalBets,
        uniqueUsers: uniqueUsers.size,
      };
      
      const statsToSave: BetStatsData = {
        ...betStats,
        roundId: currentRound?.id,
        calculationTimeMs: Date.now() - startTime,
      };

      await this.betStatsRepository.saveStats(statsToSave);
      
      // 5. Calculate profitable openings
      const profitableOpenings = this.profitCalculator.calculateAllQuadProfits(betStats);
      
      // 6. Cache in Redis
      await this.redisService.set(
        this.CACHE_KEY,
        JSON.stringify(profitableOpenings),
        this.CACHE_TTL
      );
      
      // 7. Broadcast via WebSocket
      this.websocketGateway.broadcast('openings_update', profitableOpenings);
      this.websocketGateway.broadcast('stats_update', {
        totalStake,
        totalBets,
        uniqueUsers: uniqueUsers.size,
        timestamp: new Date(),
      });
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Aggregated ${totalBets} bets in ${duration}ms`);
      
      // 8. Log if calculation time exceeds threshold
      if (profitableOpenings.calculationTimeMs > 15) {
        this.logger.warn(`Profit calculation took ${profitableOpenings.calculationTimeMs}ms (threshold: 15ms)`);
      }
      
    } catch (error) {
      this.logger.error('Error in bet aggregation:', error);
    }
  }
}

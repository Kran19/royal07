import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BetStatsData {
  roundId?: string;
  singles: Map<number, number>;
  pairs: Map<string, number>;
  triples: Map<string, number>;
  quads: Map<string, number>;
  totalStake: number;
  totalBets: number;
  uniqueUsers: number;
  calculationTimeMs: number;
}

@Injectable()
export class BetStatsRepository {
  constructor(private prisma: PrismaService) {}

  async saveStats(data: BetStatsData) {
    // Map objects to regular JSON for Prisma inserting into Postgres
    const singlesObj: Record<string, number> = {};
    const pairsObj: Record<string, number> = {};
    const triplesObj: Record<string, number> = {};
    const quadsObj: Record<string, number> = {};

    data.singles.forEach((val, key) => singlesObj[key.toString()] = val);
    data.pairs.forEach((val, key) => pairsObj[key] = val);
    data.triples.forEach((val, key) => triplesObj[key] = val);
    data.quads.forEach((val, key) => quadsObj[key] = val);

    return this.prisma.betStats.create({
      data: {
        roundId: data.roundId,
        singlesData: singlesObj,
        pairsData: pairsObj,
        triplesData: triplesObj,
        quadsData: quadsObj,
        totalStake: data.totalStake,
        totalBets: data.totalBets,
        uniqueUsers: data.uniqueUsers,
        calculationTimeMs: data.calculationTimeMs,
      }
    });
  }
}

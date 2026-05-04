import { Injectable } from '@nestjs/common';
import { ALL_QUADRUPLES, PAYOUT_MULTIPLIERS } from '../../../common/constants/quadruples';

export interface BetStats {
  singles: Map<number, number>;
  pairs: Map<string, number>;
  triples: Map<string, number>;
  quads: Map<string, number>;
  totalStake: number;
  totalBets: number;
  uniqueUsers: number;
}

export interface QuadProfitResult {
  opening: number[];
  profit: number;
  margin: number;
  profitable: boolean;
  singlesPayout: number;
  pairsPayout: number;
  triplesPayout: number;
  quadPayout: number;
  totalPayout: number;
  rank: number;
  roi: number;
}

@Injectable()
export class ProfitCalculatorService {
  private readonly allQuadruples = ALL_QUADRUPLES;
  private readonly multipliers = PAYOUT_MULTIPLIERS;
  
  private readonly QUAD_TO_PAIRS = new Map<string, string[]>();
  private readonly QUAD_TO_TRIPLES = new Map<string, string[]>();

  constructor() {
    this.precomputeCombinations();
  }

  private precomputeCombinations() {
    for (const quad of this.allQuadruples) {
      const quadKey = quad.join(',');
      const [a, b, c, d] = quad;
      this.QUAD_TO_PAIRS.set(quadKey, [
        `${a},${b}`, `${a},${c}`, `${a},${d}`, `${b},${c}`, `${b},${d}`, `${c},${d}`
      ]);
      this.QUAD_TO_TRIPLES.set(quadKey, [
        `${a},${b},${c}`, `${a},${b},${d}`, `${a},${c},${d}`, `${b},${c},${d}`
      ]);
    }
  }

  /**
   * Calculate profit for all 495 quadruples in O(495) time
   * Returns top 10 most profitable openings
   */
  calculateAllQuadProfits(betStats: BetStats): {
    results: QuadProfitResult[];
    totalProfitable: number;
    totalQuadruples: number;
    totalStake: number;
    calculationTimeMs: number;
    timestamp: Date;
    avgProfitMargin: number;
  } {
    const startTime = performance.now();
    
    // Pre-calculate singles array for O(1) access
    const singlesArray = new Array(13).fill(0);
    for (let i = 1; i <= 12; i++) {
      singlesArray[i] = betStats.singles.get(i) || 0;
    }
    
    const pairsMap   = betStats.pairs;
    const triplesMap = betStats.triples;
    const quadsMap   = betStats.quads;
    const totalStake = betStats.totalStake;
    const results: QuadProfitResult[] = [];
    
    // Iterate through all 495 quadruples
    for (let idx = 0; idx < this.allQuadruples.length; idx++) {
      const quad = this.allQuadruples[idx];
      const [a, b, c, d] = quad;
      
      // ── Singles payout: 3× per winning single ──
      const singlesSum = singlesArray[a] + singlesArray[b] + singlesArray[c] + singlesArray[d];
      const singlesPayout = this.multipliers[1] * singlesSum;
      
      // ── Quad payout: exact match only ──
      const quadKey = [a, b, c, d].join(','); // allQuadruples are already sorted ascending
      
      // ── Pairs payout: check all C(4,2)=6 pairs within this quad ──
      let pairsPayout = 0;
      const pairs = this.QUAD_TO_PAIRS.get(quadKey) || [];
      for (const key of pairs) {
        pairsPayout += this.multipliers[2] * (pairsMap.get(key) || 0);
      }
      
      // ── Triples payout: check all C(4,3)=4 triples within this quad ──
      let triplesPayout = 0;
      const triples = this.QUAD_TO_TRIPLES.get(quadKey) || [];
      for (const key of triples) {
        triplesPayout += this.multipliers[3] * (triplesMap.get(key) || 0);
      }
      
      const quadPayout = this.multipliers[4] * (quadsMap.get(quadKey) || 0);
      
      const totalPayout = singlesPayout + pairsPayout + triplesPayout + quadPayout;
      const profit = totalStake - totalPayout;
      const margin = totalStake > 0 ? (profit / totalStake * 100) : 0;
      const roi = totalStake > 0 ? profit / totalStake : 0;
      
      results.push({
        opening: quad,
        profit: Math.round(profit),
        margin: parseFloat(margin.toFixed(2)),
        profitable: profit > 0,
        singlesPayout: Math.round(singlesPayout),
        pairsPayout: Math.round(pairsPayout),
        triplesPayout: Math.round(triplesPayout),
        quadPayout: Math.round(quadPayout),
        totalPayout: Math.round(totalPayout),
        rank: 0,
        roi: parseFloat(roi.toFixed(4)),
      });
    }
    
    // Sort by profit descending
    results.sort((a, b) => b.profit - a.profit);
    
    // Assign ranks
    results.forEach((r, idx) => {
      r.rank = idx + 1;
    });
    
    const calculationTime = performance.now() - startTime;
    const profitableResults = results.filter(r => r.profitable);
    const avgProfitMargin = profitableResults.length > 0
      ? profitableResults.reduce((sum, r) => sum + r.margin, 0) / profitableResults.length
      : 0;
    
    return {
      results: results.slice(0, 10), // Top 10 only
      totalProfitable: profitableResults.length,
      totalQuadruples: 495,
      totalStake,
      calculationTimeMs: Math.round(calculationTime),
      timestamp: new Date(),
      avgProfitMargin: parseFloat(avgProfitMargin.toFixed(2)),
    };
  }
  

  /**
   * Check if a specific opening is profitable
   */
  checkOpeningProfitability(
    betStats: BetStats,
    opening: number[]
  ): QuadProfitResult {
    const singlesArray = new Array(13).fill(0);
    for (let i = 1; i <= 12; i++) {
      singlesArray[i] = betStats.singles.get(i) || 0;
    }
    
    const totalStake = betStats.totalStake;
    
    const [a, b, c, d] = [...opening].sort((x, y) => x - y);
    const quadKey = `${a},${b},${c},${d}`;
    
    const singlesSum = singlesArray[a] + singlesArray[b] + singlesArray[c] + singlesArray[d];
    const singlesPayout = this.multipliers[1] * singlesSum;
    
    let pairsPayout = 0;
    const pairs = this.QUAD_TO_PAIRS.get(quadKey) || [
      `${a},${b}`, `${a},${c}`, `${a},${d}`, `${b},${c}`, `${b},${d}`, `${c},${d}`
    ];
    for (const key of pairs) {
      pairsPayout += this.multipliers[2] * (betStats.pairs.get(key) || 0);
    }
    
    let triplesPayout = 0;
    const triples = this.QUAD_TO_TRIPLES.get(quadKey) || [
      `${a},${b},${c}`, `${a},${b},${d}`, `${a},${c},${d}`, `${b},${c},${d}`
    ];
    for (const key of triples) {
      triplesPayout += this.multipliers[3] * (betStats.triples.get(key) || 0);
    }
    
    const quadPayout = this.multipliers[4] * (betStats.quads.get(quadKey) || 0);
    
    const totalPayout = singlesPayout + pairsPayout + triplesPayout + quadPayout;
    const profit = totalStake - totalPayout;
    const margin = totalStake > 0 ? (profit / totalStake * 100) : 0;
    const roi = totalStake > 0 ? profit / totalStake : 0;
    
    return {
      opening,
      profit: Math.round(profit),
      profitable: profit > 0,
      margin: parseFloat(margin.toFixed(2)),
      singlesPayout: Math.round(singlesPayout),
      pairsPayout: Math.round(pairsPayout),
      triplesPayout: Math.round(triplesPayout),
      quadPayout: Math.round(quadPayout),
      totalPayout: Math.round(totalPayout),
      rank: 0,
      roi: parseFloat(roi.toFixed(4)),
    };
  }
}

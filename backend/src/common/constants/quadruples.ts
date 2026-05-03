// All 495 possible 4-number combinations from 1-12
export const ALL_QUADRUPLES: number[][] = (() => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const quadruples: number[][] = [];
  
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      for (let k = j + 1; k < numbers.length; k++) {
        for (let l = k + 1; l < numbers.length; l++) {
          quadruples.push([numbers[i], numbers[j], numbers[k], numbers[l]]);
        }
      }
    }
  }
  
  return quadruples;
})();

// Pre-compute number to quadruples mapping for O(1) lookups
export const NUMBER_TO_QUADRUPLES: Map<number, number[][]> = (() => {
  const map = new Map<number, number[][]>();
  for (let i = 1; i <= 12; i++) map.set(i, []);
  for (const quad of ALL_QUADRUPLES) {
    for (const num of quad) map.get(num)!.push(quad);
  }
  return map;
})();

// Payout multipliers
export const PAYOUT_MULTIPLIERS = {
  1: 3,   // Single: stake × 3
  2: 10,  // Pair: stake × 10
  3: 20,  // Triple: stake × 20
  4: 30,  // Quad: stake × 30
} as const;

export const FLOORS = Array.from({ length: 12 }, (_, i) => i + 1)

export const PAIR_MULTIPLIERS: Record<number, number> = {
  2: 10,
  3: 20,
  4: 30,
}

export function randomStops(minStops = 1, maxStops = 4) {
  const count = Math.floor(Math.random() * (maxStops - minStops + 1)) + minStops
  const bag = new Set<number>()
  while (bag.size < count) {
    bag.add(Math.floor(Math.random() * 12) + 1)
  }
  return [...bag].sort((a, b) => a - b)
}

function toPositiveInt(value: any) {
  const num = Number.parseInt(value, 10)
  if (Number.isNaN(num) || num <= 0) return 0
  return num
}

export type BetTemplate = {
  floors: number[];
  stake: number;
  potentialWin: number;
} & (
  | { mode: 'SIMPLE'; floorBets: Record<number, number> }
  | { mode: 'PAIR'; pairAmount: number }
);

export type ValidationResult = {
  valid: boolean;
  error?: string;
  template?: BetTemplate;
};

export function createSimpleBetTemplate(simpleFloorAmounts: Record<number, any>): ValidationResult {
  const floorBets: Record<number, number> = {}
  let stake = 0

  FLOORS.forEach((floor) => {
    const amt = toPositiveInt(simpleFloorAmounts[floor])
    if (amt > 0) {
      floorBets[floor] = amt
      stake += amt
    }
  })

  if (stake <= 0) {
    return { valid: false, error: 'Enter amount on at least 1 floor' }
  }

  return {
    valid: true,
    template: {
      mode: 'SIMPLE',
      floorBets,
      floors: Object.keys(floorBets).map(Number),
      stake,
      potentialWin: stake * 3,
    },
  }
}

export function createSimpleSelectionTemplate(selectedFloors: number[], amountPerFloor: string | number): ValidationResult {
  const amount = toPositiveInt(amountPerFloor)
  if (!selectedFloors.length) {
    return { valid: false, error: 'Select at least 1 floor' }
  }
  if (amount <= 0) {
    return { valid: false, error: 'Enter a valid amount' }
  }

  const floorBets: Record<number, number> = {}
  selectedFloors.forEach((floor) => {
    floorBets[floor] = amount
  })

  const stake = selectedFloors.length * amount
  return {
    valid: true,
    template: {
      mode: 'SIMPLE',
      floorBets,
      floors: [...selectedFloors].sort((a, b) => a - b),
      stake,
      potentialWin: stake * 3,  // 3x per winning floor
    },
  }
}

export function createPairBetTemplate(pairFloors: number[], pairAmount: string | number): ValidationResult {
  const amount = toPositiveInt(pairAmount)
  if (pairFloors.length < 2 || pairFloors.length > 4) {
    return { valid: false, error: 'Pair mode needs 2, 3, or 4 floors' }
  }
  if (amount <= 0) {
    return { valid: false, error: 'Enter a valid pair amount' }
  }

  const multiplier = PAIR_MULTIPLIERS[pairFloors.length] || 0
  return {
    valid: true,
    template: {
      mode: 'PAIR',
      floors: [...pairFloors].sort((a, b) => a - b),
      pairAmount: amount,
      stake: amount,
      potentialWin: amount * multiplier,
    },
  }
}

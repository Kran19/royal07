// User Types
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  INACTIVE = 'INACTIVE',
}

export enum UserKYCStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  mobile: string;
  username: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  kycStatus: UserKYCStatus;
  currency: string;
  avatar?: string;
  totalBets: number;
  totalWon: number;
  totalDeposit: number;
  totalWithdraw: number;
  balance: number;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  operatorId?: string | null;
}

// Wallet & Transaction Types
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET_PLACED = 'BET_PLACED',
  BET_WON = 'BET_WON',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  reference?: string;
  createdAt: Date;
}

// Game Round Types
export enum RoundStatus {
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export interface GameRound {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  openingResult: number[];
  openingType: string;
  totalStake: number;
  totalPayout: number;
  houseProfit: number;
  startedAt: Date;
  endedAt?: Date;
}

// Bet Types
export enum BetType {
  SINGLE = 'SINGLE',
  PAIR = 'PAIR',
  TRIPLE = 'TRIPLE',
  QUAD = 'QUAD',
}

export enum BetStatus {
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export interface Bet {
  id: string;
  userId: string;
  user?: User;
  roundId: string;
  round?: GameRound;
  betType: BetType;
  numbers: number[];
  amount: number;
  status: BetStatus;
  settlementAmount?: number;
  payoutMultiplier?: number;
  createdAt: Date;
}

// House Profit Calculations (Spec Section 5.2 / 8.5)
export interface QuadProfitResult {
  opening: number[];
  profit: number;
  margin: number;
  profitable: boolean;
  singlesPayout: number;
  quadPayout: number;
  rank: number;
  roi: number;
}

export interface BetStats {
  timestamp: Date;
  totalStake: number;
  totalBets: number;
  uniqueUsers: number;
  singles: Record<number, number>;
  pairs: Record<string, number>;
  triples: Record<string, number>;
  quads: Record<string, number>;
  totalPayoutToday: number;
  profitLossToday: number;
  calculationTimeMs?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Audit Log Types
export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  WALLET_ADJUSTED = 'WALLET_ADJUSTED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: Date;
}

// Admin Settings Types
export interface AdminSettings {
  id: string;
  roundDuration: number;
  minBetAmount: number;
  maxBetAmount: number;
  maintenanceMode: boolean;
  
  // Payment Config
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
  paymentInstructions?: string | null;
  houseProfitPercent?: number;
}

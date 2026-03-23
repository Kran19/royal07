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
  username: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  kycStatus: UserKYCStatus;
  avatar?: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isFlagged: boolean;
  flagReason?: string;
}

export interface UserNote {
  id: string;
  userId: string;
  note: string;
  createdBy: string;
  createdAt: Date;
}

// Wallet & Transaction Types
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET_PLACED = 'BET_PLACED',
  BET_WON = 'BET_WON',
  PAYOUT = 'PAYOUT',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface WalletTransaction {
  id: string;
  userId: string;
  user?: User;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  reference?: string;
  relatedBetId?: string;
  relatedRoundId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  userId: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalBets: number;
  totalWinnings: number;
  lastTransactionAt?: Date;
}

// Game Round Types
export enum RoundStatus {
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export interface GameRound {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  startTime: Date;
  endTime?: Date;
  result?: number; // The final number/floor where the elevator stopped
  totalStake: number;
  totalPayout: number;
  numberOfBets: number;
  numberOfWinningBets: number;
  exposureByFloor: Record<number, number>;
  exposureByPair: Record<string, number>;
  maxPayoutRisk: number;
  createdAt: Date;
  updatedAt: Date;
}

// Bet & Bet Item Types
export enum BetMode {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
  PARLAY = 'PARLAY',
}

export enum BetStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  WON = 'WON',
  LOST = 'LOST',
  VOIDED = 'VOIDED',
  CANCELLED = 'CANCELLED',
}

export interface BetItem {
  id: string;
  betId: string;
  floorNumber: number;
  pair: string; // e.g., "UP/DOWN"
  odds: number;
  stake: number;
  settlement: Settlement;
}

export interface Settlement {
  status: 'WON' | 'LOST' | 'VOIDED';
  payout: number;
  settledAt: Date;
}

export interface Bet {
  id: string;
  userId: string;
  user?: User;
  roundId: string;
  round?: GameRound;
  mode: BetMode;
  status: BetStatus;
  totalStake: number;
  totalPayout: number;
  betItems: BetItem[];
  createdAt: Date;
  updatedAt: Date;
  settledAt?: Date;
}

// Audit Log Types
export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  WALLET_ADJUSTED = 'WALLET_ADJUSTED',
  BET_CANCELLED = 'BET_CANCELLED',
  ROUND_CREATED = 'ROUND_CREATED',
  ROUND_SETTLED = 'ROUND_SETTLED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  EXPORT_GENERATED = 'EXPORT_GENERATED',
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Admin Settings Types
export interface RoundTimingSettings {
  roundDuration: number; // milliseconds
  betClosingTime: number; // milliseconds before round end
  resultAnnouncementDelay: number; // milliseconds
}

export interface BetLimitSettings {
  minBetAmount: number;
  maxBetAmount: number;
  maxBetsPerUser: number;
  maxBetsPerRound: number;
}

export interface ChipPresetSettings {
  presets: number[];
}

export interface AutoplayLimitSettings {
  maxAutoplayBets: number;
  enabled: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  alertOnSuspiciousBehavior: boolean;
  alertOnLargeBets: boolean;
}

export interface AdminSettings {
  id: string;
  roundTiming: RoundTimingSettings;
  betLimits: BetLimitSettings;
  chipPresets: ChipPresetSettings;
  autoplayLimits: AutoplayLimitSettings;
  notifications: NotificationSettings;
  maintenanceMode: boolean;
  updatedAt: Date;
  updatedBy: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBetsToday: number;
  totalStakeToday: number;
  totalPayoutToday: number;
  profitLossToday: number;
  currentActiveRound?: GameRound;
  recentBets: Bet[];
  recentWins: Bet[];
  flaggedUsers: User[];
  riskExposureSummary: {
    totalExposure: number;
    maxPayoutRisk: number;
    exposureByFloor: Record<number, number>;
    exposureByPair: Record<string, number>;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

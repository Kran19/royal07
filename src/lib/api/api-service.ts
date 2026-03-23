import {
  User,
  UserStatus,
  UserKYCStatus,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  GameRound,
  RoundStatus,
  Bet,
  BetMode,
  BetStatus,
  AuditLog,
  AuditAction,
  AdminSettings,
  DashboardStats,
  PaginatedResponse,
  ApiResponse,
  UserNote,
  Wallet,
} from '@/types';

// Utility functions for mock data generation
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (date: Date) => new Date(date);
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Mock Users
const mockUsers: User[] = [
  {
    id: 'user-001',
    username: 'shadow_gamer',
    email: 'shadow@example.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
    kycStatus: UserKYCStatus.VERIFIED,
    totalBets: 1250,
    totalWins: 480,
    totalLosses: 770,
    walletBalance: 52500,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-03-20'),
    lastLogin: new Date('2024-03-20T14:30:00'),
    isFlagged: false,
  },
  {
    id: 'user-002',
    username: 'lucky_dragon',
    email: 'lucky@example.com',
    phone: '+1234567891',
    firstName: 'Jane',
    lastName: 'Smith',
    status: UserStatus.ACTIVE,
    kycStatus: UserKYCStatus.VERIFIED,
    totalBets: 890,
    totalWins: 320,
    totalLosses: 570,
    walletBalance: 125300,
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date('2024-03-19'),
    lastLogin: new Date('2024-03-19T10:15:00'),
    isFlagged: false,
  },
  {
    id: 'user-003',
    username: 'crypto_king',
    email: 'crypto@example.com',
    phone: '+1234567892',
    firstName: 'Mike',
    lastName: 'Johnson',
    status: UserStatus.SUSPENDED,
    kycStatus: UserKYCStatus.PENDING,
    totalBets: 2100,
    totalWins: 650,
    totalLosses: 1450,
    walletBalance: 8900,
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2024-03-18'),
    lastLogin: new Date('2024-03-18T08:45:00'),
    isFlagged: true,
    flagReason: 'Unusual betting patterns detected',
  },
  {
    id: 'user-004',
    username: 'poker_pro',
    email: 'poker@example.com',
    phone: '+1234567893',
    firstName: 'Sarah',
    lastName: 'Williams',
    status: UserStatus.ACTIVE,
    kycStatus: UserKYCStatus.VERIFIED,
    totalBets: 450,
    totalWins: 210,
    totalLosses: 240,
    walletBalance: 34500,
    createdAt: new Date('2023-08-22'),
    updatedAt: new Date('2024-03-20'),
    lastLogin: new Date('2024-03-20T16:20:00'),
    isFlagged: false,
  },
  {
    id: 'user-005',
    username: 'high_roller',
    email: 'roller@example.com',
    phone: '+1234567894',
    firstName: 'David',
    lastName: 'Brown',
    status: UserStatus.ACTIVE,
    kycStatus: UserKYCStatus.VERIFIED,
    totalBets: 5600,
    totalWins: 2100,
    totalLosses: 3500,
    walletBalance: 750000,
    createdAt: new Date('2023-01-05'),
    updatedAt: new Date('2024-03-20'),
    lastLogin: new Date('2024-03-20T18:10:00'),
    isFlagged: false,
  },
];

// Mock Transactions
const mockTransactions: WalletTransaction[] = [
  {
    id: 'txn-001',
    userId: 'user-001',
    type: TransactionType.DEPOSIT,
    amount: 10000,
    status: TransactionStatus.COMPLETED,
    description: 'Credit Card Deposit',
    reference: 'VISA-****1234',
    createdAt: new Date('2024-03-20T09:15:00'),
    updatedAt: new Date('2024-03-20T09:15:00'),
  },
  {
    id: 'txn-002',
    userId: 'user-001',
    type: TransactionType.BET_PLACED,
    amount: -5000,
    status: TransactionStatus.COMPLETED,
    description: 'Bet Placed - Round #1255',
    relatedBetId: 'bet-001',
    relatedRoundId: 'round-001',
    createdAt: new Date('2024-03-20T10:30:00'),
    updatedAt: new Date('2024-03-20T10:30:00'),
  },
  {
    id: 'txn-003',
    userId: 'user-001',
    type: TransactionType.BET_WON,
    amount: 12500,
    status: TransactionStatus.COMPLETED,
    description: 'Bet Won - Round #1255',
    relatedBetId: 'bet-001',
    relatedRoundId: 'round-001',
    createdAt: new Date('2024-03-20T10:45:00'),
    updatedAt: new Date('2024-03-20T10:45:00'),
  },
  {
    id: 'txn-004',
    userId: 'user-002',
    type: TransactionType.DEPOSIT,
    amount: 50000,
    status: TransactionStatus.COMPLETED,
    description: 'Bank Transfer',
    reference: 'BANK-TRANSFER-2024-0320',
    createdAt: new Date('2024-03-19T14:20:00'),
    updatedAt: new Date('2024-03-19T14:20:00'),
  },
];

// Mock Rounds
const mockRounds: GameRound[] = [
  {
    id: 'round-001',
    roundNumber: 1255,
    status: RoundStatus.ACTIVE,
    startTime: new Date('2024-03-20T11:00:00'),
    result: undefined,
    totalStake: 125000,
    totalPayout: 0,
    numberOfBets: 45,
    numberOfWinningBets: 0,
    exposureByFloor: {
      1: 12000,
      2: 15000,
      3: 25000,
      4: 35000,
      5: 28000,
      6: 10000,
    },
    exposureByPair: {
      'UP/DOWN': 75000,
      'ODD/EVEN': 50000,
    },
    maxPayoutRisk: 250000,
    createdAt: new Date('2024-03-20T11:00:00'),
    updatedAt: new Date('2024-03-20T11:15:00'),
  },
  {
    id: 'round-002',
    roundNumber: 1254,
    status: RoundStatus.SETTLED,
    startTime: new Date('2024-03-20T10:30:00'),
    endTime: new Date('2024-03-20T10:45:00'),
    result: 3,
    totalStake: 98000,
    totalPayout: 156000,
    numberOfBets: 38,
    numberOfWinningBets: 15,
    exposureByFloor: {
      1: 8000,
      2: 12000,
      3: 32000,
      4: 28000,
      5: 15000,
      6: 3000,
    },
    exposureByPair: {
      'UP/DOWN': 60000,
      'ODD/EVEN': 38000,
    },
    maxPayoutRisk: 195000,
    createdAt: new Date('2024-03-20T10:30:00'),
    updatedAt: new Date('2024-03-20T10:45:00'),
  },
];

// Mock Bets
const mockBets: Bet[] = [
  {
    id: 'bet-001',
    userId: 'user-001',
    roundId: 'round-002',
    mode: BetMode.MULTI,
    status: BetStatus.WON,
    totalStake: 5000,
    totalPayout: 12500,
    betItems: [
      {
        id: 'bet-item-001',
        betId: 'bet-001',
        floorNumber: 3,
        pair: 'UP/DOWN',
        odds: 2.5,
        stake: 5000,
        settlement: {
          status: 'WON',
          payout: 12500,
          settledAt: new Date('2024-03-20T10:45:00'),
        },
      },
    ],
    createdAt: new Date('2024-03-20T10:30:00'),
    updatedAt: new Date('2024-03-20T10:45:00'),
    settledAt: new Date('2024-03-20T10:45:00'),
  },
  {
    id: 'bet-002',
    userId: 'user-002',
    roundId: 'round-002',
    mode: BetMode.SINGLE,
    status: BetStatus.LOST,
    totalStake: 8000,
    totalPayout: 0,
    betItems: [
      {
        id: 'bet-item-002',
        betId: 'bet-002',
        floorNumber: 5,
        pair: 'ODD/EVEN',
        odds: 1.8,
        stake: 8000,
        settlement: {
          status: 'LOST',
          payout: 0,
          settledAt: new Date('2024-03-20T10:45:00'),
        },
      },
    ],
    createdAt: new Date('2024-03-20T10:32:00'),
    updatedAt: new Date('2024-03-20T10:45:00'),
    settledAt: new Date('2024-03-20T10:45:00'),
  },
];

// Mock Audit Logs
const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    adminId: 'admin-001',
    adminName: 'Alice Admin',
    action: AuditAction.USER_SUSPENDED,
    entityType: 'USER',
    entityId: 'user-003',
    changes: { status: UserStatus.ACTIVE, newStatus: UserStatus.SUSPENDED },
    description: 'User suspended due to suspicious betting activity',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date('2024-03-20T15:30:00'),
  },
  {
    id: 'audit-002',
    adminId: 'admin-002',
    adminName: 'Bob Baker',
    action: AuditAction.WALLET_ADJUSTED,
    entityType: 'USER',
    entityId: 'user-001',
    changes: { amount: 10000, reason: 'Bonus credit' },
    description: 'Manual wallet adjustment - bonus credit',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date('2024-03-20T14:15:00'),
  },
];

// API Service
export const apiService = {
  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            totalUsers: mockUsers.length,
            activeUsers: mockUsers.filter((u) => u.status === UserStatus.ACTIVE).length,
            totalBetsToday: 128,
            totalStakeToday: 450000,
            totalPayoutToday: 580000,
            profitLossToday: -130000,
            currentActiveRound: mockRounds[0],
            recentBets: mockBets.slice(0, 5),
            recentWins: mockBets.filter((b) => b.status === BetStatus.WON).slice(0, 5),
            flaggedUsers: mockUsers.filter((u) => u.isFlagged),
            riskExposureSummary: {
              totalExposure: 223000,
              maxPayoutRisk: 250000,
              exposureByFloor: mockRounds[0].exposureByFloor,
              exposureByPair: mockRounds[0].exposureByPair,
            },
          },
        });
      }, 300);
    });
  },

  // Users
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    status?: UserStatus
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockUsers;

        if (search) {
          filtered = filtered.filter(
            (u) =>
              u.username.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase()) ||
              u.firstName.toLowerCase().includes(search.toLowerCase()) ||
              u.lastName.toLowerCase().includes(search.toLowerCase())
          );
        }

        if (status) {
          filtered = filtered.filter((u) => u.status === status);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        resolve({
          success: true,
          data: {
            data,
            total,
            page,
            pageSize,
            totalPages,
          },
        });
      }, 300);
    });
  },

  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find((u) => u.id === userId);
        resolve({
          success: !!user,
          data: user,
          error: user ? undefined : 'User not found',
        });
      }, 200);
    });
  },

  async getUserNotes(userId: string): Promise<ApiResponse<UserNote[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const notes: UserNote[] = [
          {
            id: 'note-001',
            userId,
            note: 'User exhibited unusual betting patterns in last session',
            createdBy: 'admin-001',
            createdAt: new Date('2024-03-19T10:00:00'),
          },
        ];
        resolve({ success: true, data: notes });
      }, 200);
    });
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) {
          user.status = status;
          user.updatedAt = new Date();
        }
        resolve({
          success: !!user,
          data: user,
          message: user ? 'User status updated' : 'User not found',
        });
      }, 300);
    });
  },

  // Transactions
  async getTransactions(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      userId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ApiResponse<PaginatedResponse<WalletTransaction>>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockTransactions;

        if (filters?.userId) {
          filtered = filtered.filter((t) => t.userId === filters.userId);
        }
        if (filters?.type) {
          filtered = filtered.filter((t) => t.type === filters.type);
        }
        if (filters?.status) {
          filtered = filtered.filter((t) => t.status === filters.status);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        resolve({
          success: true,
          data: {
            data,
            total,
            page,
            pageSize,
            totalPages,
          },
        });
      }, 300);
    });
  },

  // Rounds
  async getRounds(
    page: number = 1,
    pageSize: number = 20,
    status?: RoundStatus
  ): Promise<ApiResponse<PaginatedResponse<GameRound>>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockRounds;

        if (status) {
          filtered = filtered.filter((r) => r.status === status);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        resolve({
          success: true,
          data: {
            data,
            total,
            page,
            pageSize,
            totalPages,
          },
        });
      }, 300);
    });
  },

  async getRoundById(roundId: string): Promise<ApiResponse<GameRound>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const round = mockRounds.find((r) => r.id === roundId);
        resolve({
          success: !!round,
          data: round,
          error: round ? undefined : 'Round not found',
        });
      }, 200);
    });
  },

  async getRoundBets(roundId: string): Promise<ApiResponse<Bet[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const bets = mockBets.filter((b) => b.roundId === roundId);
        resolve({
          success: true,
          data: bets,
        });
      }, 300);
    });
  },

  // Bets
  async getBets(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      roundId?: string;
      userId?: string;
      mode?: BetMode;
      status?: BetStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ApiResponse<PaginatedResponse<Bet>>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockBets;

        if (filters?.roundId) {
          filtered = filtered.filter((b) => b.roundId === filters.roundId);
        }
        if (filters?.userId) {
          filtered = filtered.filter((b) => b.userId === filters.userId);
        }
        if (filters?.mode) {
          filtered = filtered.filter((b) => b.mode === filters.mode);
        }
        if (filters?.status) {
          filtered = filtered.filter((b) => b.status === filters.status);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        resolve({
          success: true,
          data: {
            data,
            total,
            page,
            pageSize,
            totalPages,
          },
        });
      }, 300);
    });
  },

  async getBetById(betId: string): Promise<ApiResponse<Bet>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const bet = mockBets.find((b) => b.id === betId);
        resolve({
          success: !!bet,
          data: bet,
          error: bet ? undefined : 'Bet not found',
        });
      }, 200);
    });
  },

  // Audit Logs
  async getAuditLogs(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      adminId?: string;
      action?: AuditAction;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockAuditLogs;

        if (filters?.adminId) {
          filtered = filtered.filter((l) => l.adminId === filters.adminId);
        }
        if (filters?.action) {
          filtered = filtered.filter((l) => l.action === filters.action);
        }
        if (filters?.entityId) {
          filtered = filtered.filter((l) => l.entityId === filters.entityId);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        resolve({
          success: true,
          data: {
            data,
            total,
            page,
            pageSize,
            totalPages,
          },
        });
      }, 300);
    });
  },

  // Settings
  async getSettings(): Promise<ApiResponse<AdminSettings>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: 'settings-001',
            roundTiming: {
              roundDuration: 900000,
              betClosingTime: 60000,
              resultAnnouncementDelay: 5000,
            },
            betLimits: {
              minBetAmount: 100,
              maxBetAmount: 100000,
              maxBetsPerUser: 50,
              maxBetsPerRound: 500,
            },
            chipPresets: {
              presets: [100, 500, 1000, 5000, 10000, 50000],
            },
            autoplayLimits: {
              maxAutoplayBets: 100,
              enabled: true,
            },
            notifications: {
              emailNotifications: true,
              smsNotifications: true,
              inAppNotifications: true,
              alertOnSuspiciousBehavior: true,
              alertOnLargeBets: true,
            },
            maintenanceMode: false,
            updatedAt: new Date('2024-03-15T10:00:00'),
            updatedBy: 'admin-001',
          },
        });
      }, 200);
    });
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<ApiResponse<AdminSettings>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: 'settings-001',
            roundTiming: settings.roundTiming || {
              roundDuration: 900000,
              betClosingTime: 60000,
              resultAnnouncementDelay: 5000,
            },
            betLimits: settings.betLimits || {
              minBetAmount: 100,
              maxBetAmount: 100000,
              maxBetsPerUser: 50,
              maxBetsPerRound: 500,
            },
            chipPresets: settings.chipPresets || {
              presets: [100, 500, 1000, 5000, 10000, 50000],
            },
            autoplayLimits: settings.autoplayLimits || {
              maxAutoplayBets: 100,
              enabled: true,
            },
            notifications: settings.notifications || {
              emailNotifications: true,
              smsNotifications: true,
              inAppNotifications: true,
              alertOnSuspiciousBehavior: true,
              alertOnLargeBets: true,
            },
            maintenanceMode: settings.maintenanceMode ?? false,
            updatedAt: new Date(),
            updatedBy: 'admin-001',
          },
        });
      }, 300);
    });
  },

  // Wallet
  async getUserWallet(userId: string): Promise<ApiResponse<Wallet>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find((u) => u.id === userId);
        if (!user) {
          resolve({
            success: false,
            error: 'User not found',
          });
          return;
        }

        resolve({
          success: true,
          data: {
            userId,
            balance: user.walletBalance,
            totalDeposited: 250000,
            totalWithdrawn: 100000,
            totalBets: user.totalBets * 1000, // mock calculation
            totalWinnings: user.totalWins * 2000, // mock calculation
            lastTransactionAt: new Date('2024-03-20T14:30:00'),
          },
        });
      }, 200);
    });
  },
};

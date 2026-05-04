import {
  User,
  UserStatus,
  Bet,
  BetType,
  BetStatus,
  GameRound,
  RoundStatus,
  Transaction,
  BetStats,
  QuadProfitResult,
  AuditLog,
  AuditAction,
  AdminSettings,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
/**
 * Production-ready API Service for RoyalBet
 * Aligned with the Modular NestJS 10 backend.
 */
export const apiService = {
  // --- Auth ---
  async login(credentials: any): Promise<ApiResponse<{ token: string; user: User }>> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },

  async register(data: any): Promise<ApiResponse<{ token: string; user: User }>> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // --- Users ---
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getUsers(page = 1, limit = 20, search = '', status?: UserStatus): Promise<ApiResponse<PaginatedResponse<User>>> {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      ...(status && { status }),
    });
    const res = await fetch(`${API_BASE}/users?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getUserById(id: string): Promise<ApiResponse<User>> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<ApiResponse<User>> {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // --- Game Rounds ---
  async getCurrentRound(): Promise<ApiResponse<GameRound>> {
    const res = await fetch(`${API_BASE}/game/current-round`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getRoundHistory(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<GameRound>>> {
    const res = await fetch(`${API_BASE}/game/history?page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getRoundBets(roundId: string): Promise<ApiResponse<Bet[]>> {
    const res = await fetch(`${API_BASE}/bets/round/${roundId}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  // --- Betting ---
  async placeBet(betData: { betType: BetType; numbers: number[]; amount: number }): Promise<ApiResponse<Bet>> {
    const res = await fetch(`${API_BASE}/bets/place`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(betData),
    });
    return res.json();
  },

  async getMyBets(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Bet>>> {
    const res = await fetch(`${API_BASE}/bets/history?page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getAllBets(page = 1, limit = 20, filters: any = {}): Promise<ApiResponse<PaginatedResponse<Bet>>> {
    const queryData: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        queryData[key] = String(value);
      }
    });

    const query = new URLSearchParams(queryData);
    const res = await fetch(`${API_BASE}/bets?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  // --- House Analytics (Admin Dashboard) ---
  async getCurrentHouseStats(): Promise<ApiResponse<BetStats>> {
    const res = await fetch(`${API_BASE}/stats/current`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getProfitableOpenings(): Promise<ApiResponse<{ results: QuadProfitResult[]; totalProfitable: number }>> {
    const res = await fetch(`${API_BASE}/stats/profitable-openings`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  // --- Wallet & Transactions ---
  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    const res = await fetch(`${API_BASE}/wallet/balance`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getTransactionHistory(page = 1, limit = 20, search?: string, type?: string, status?: string): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.append('search', search);
    if (type) query.append('type', type);
    if (status) query.append('status', status);
    
    const res = await fetch(`${API_BASE}/wallet/admin/transactions?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getAuditLogs(page = 1, limit = 20, filters: any = {}): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    const res = await fetch(`${API_BASE}/audit?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getSettings(): Promise<ApiResponse<AdminSettings>> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<ApiResponse<AdminSettings>> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async uploadSettingsQr(file: File): Promise<ApiResponse<{ qrCodeUrl: string }>> {
    const formData = new FormData();
    formData.append('qrCode', file);

    const headers: any = this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set boundary

    const res = await fetch(`${API_BASE}/settings/qr`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },

  // --- Admin Wallet ---
  async getAdminDeposits(params: any = {}): Promise<ApiResponse<{ items: any[]; meta: any }>> {
    const query = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/wallet/admin/deposits?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async getAdminWithdrawals(params: any = {}): Promise<ApiResponse<{ items: any[]; meta: any }>> {
    const query = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/wallet/admin/withdrawals?${query}`, {
      headers: this.getAuthHeaders(),
    });
    return res.json();
  },

  async processAdminTransaction(id: string, action: 'approve' | 'reject', adminNote?: string): Promise<ApiResponse<any>> {
    const res = await fetch(`${API_BASE}/wallet/admin/${id}/${action}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ adminNote }),
    });
    return res.json();
  },

  // --- Helpers ---
  getApiBase() {
    return API_BASE;
  },

  getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }
};

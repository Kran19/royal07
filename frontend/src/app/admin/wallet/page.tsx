'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Badge, SectionCard } from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';

type DepositRequest = {
  id: string;
  userId: string;
  amount: number;
  proofImageUrl?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  user: { mobile: string; balance: number };
};

type WithdrawRequest = {
  id: string;
  userId: string;
  amount: number;
  upiOrAccount: string;
  status: string;
  adminNote?: string;
  paidAt?: string;
  createdAt: string;
  user: { mobile: string; balance: number };
};

const STATUS_COLORS: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'cyan'> = {
  PENDING: 'warning',
  WAITING_APPROVAL: 'cyan',
  APPROVED: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
  FAILED: 'danger',
  PAID: 'success',
};

export default function AdminWalletPage() {
  const [tab, setTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState({ total: 0, pages: 1, limit: 20 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      };

      const [dRes, wRes] = await Promise.all([
        apiService.getAdminDeposits(params),
        apiService.getAdminWithdrawals(params),
      ]);

      if (dRes.success && dRes.data) {
        setDeposits(dRes.data.items || []);
        if (tab === 'deposits') setMeta(dRes.data.meta);
      }
      if (wRes.success && wRes.data) {
        setWithdrawals(wRes.data.items || []);
        if (tab === 'withdrawals') setMeta(wRes.data.meta);
      }
    } catch (e) {
      console.error('Failed to fetch wallet requests', e);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1); // Reset to page 1 on search
      fetchData();
    }, 500);
    return () => clearTimeout(handler);
  }, [search, statusFilter]);

  // Regular fetch on tab or page change
  useEffect(() => {
    fetchData();
  }, [tab, page]);

  const handleAction = async (
    type: 'deposit' | 'withdrawal',
    id: string,
    action: 'approve' | 'reject',
    adminNote?: string,
  ) => {
    setProcessing(id);
    try {
      const res = await apiService.processAdminTransaction(id, action, adminNote);
      if (res.success) {
        await fetchData();
      }
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Wallet requests"
        description="Review and process user deposit and withdrawal requests."
      />

      {/* Global Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M14.5 14.5L18 18M8.5 15A6.5 6.5 0 108.5 2a6.5 6.5 0 000 13z" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by user mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-cyan-400/50 focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="WAITING_APPROVAL">Waiting Proof</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Rejected</option>
        </select>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          type="button"
          onClick={() => { setTab('deposits'); setPage(1); }}
          className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            tab === 'deposits'
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          Deposits
          {tab === 'deposits' && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
              {meta.total}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setTab('withdrawals'); setPage(1); }}
          className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            tab === 'withdrawals'
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          Withdrawals
          {tab === 'withdrawals' && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
              {meta.total}
            </span>
          )}
        </button>
      </div>

      {tab === 'deposits' && (
        <SectionCard title="Deposit Requests" description="Approve or reject user deposits after verifying payment proof.">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-700/70" />)}
            </div>
          ) : deposits.length === 0 ? (
            <p className="py-10 text-center text-slate-400">No deposit requests yet.</p>
          ) : (
            <div className="space-y-3">
              {deposits.map((d) => (
                <div key={d.id} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-white">₹{d.amount.toLocaleString()}</p>
                        <Badge variant={STATUS_COLORS[d.status] || 'info'}>{d.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-400">User: {d.user.mobile}</p>
                      <p className="text-sm text-slate-400">Balance: ₹{d.user.balance.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleString()}</p>
                      {d.adminNote && <p className="text-xs text-amber-300">Note: {d.adminNote}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      {d.proofImageUrl && (
                        <a href={`${apiService.getApiBase()}${d.proofImageUrl}`} target="_blank" rel="noreferrer">
                          <img
                            src={`${apiService.getApiBase()}${d.proofImageUrl}`}
                            alt="Payment Proof"
                            className="h-20 w-32 rounded-xl border border-white/10 object-cover hover:opacity-80"
                          />
                        </a>
                      )}
                      {(d.status === 'PENDING' || d.status === 'WAITING_APPROVAL') && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={processing === d.id}
                            onClick={() => handleAction('deposit', d.id, 'approve')}
                            className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={processing === d.id}
                            onClick={() => handleAction('deposit', d.id, 'reject', 'Rejected by admin')}
                            className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'withdrawals' && (
        <SectionCard title="Withdrawal Requests" description="Pay the user externally first, then mark as paid here to debit their account.">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-700/70" />)}
            </div>
          ) : withdrawals.length === 0 ? (
            <p className="py-10 text-center text-slate-400">No withdrawal requests yet.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-white">₹{w.amount.toLocaleString()}</p>
                        <Badge variant={STATUS_COLORS[w.status] || 'info'}>{w.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-400">User: {w.user.mobile}</p>
                      <p className="text-sm text-slate-400">UPI / Account: <span className="font-semibold text-slate-200">{w.upiOrAccount}</span></p>
                      <p className="text-sm text-slate-400">Balance: ₹{w.user.balance.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{new Date(w.createdAt).toLocaleString()}</p>
                      {w.adminNote && <p className="text-xs text-amber-300">Note: {w.adminNote}</p>}
                    </div>
                    {w.status === 'PENDING' && (
                      <div className="flex gap-2 self-start">
                        <button
                          type="button"
                          disabled={processing === w.id}
                          onClick={() => handleAction('withdrawal', w.id, 'approve')}
                          className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          disabled={processing === w.id}
                          onClick={() => handleAction('withdrawal', w.id, 'reject', 'Rejected by admin')}
                          className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Pagination Footer */}
      {meta.pages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
          <p className="text-sm text-slate-500">
            Showing page <span className="font-bold text-slate-300">{page}</span> of <span className="font-bold text-slate-300">{meta.pages}</span> ({meta.total} records)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === meta.pages || loading}
              onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
              className="flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

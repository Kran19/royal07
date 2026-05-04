'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Badge, SectionCard, TabulatorTable, Modal } from '@/components/admin/common';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [previewRequest, setPreviewRequest] = useState<DepositRequest | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ id: string; type: 'deposit' | 'withdrawal' } | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: '1',
        limit: '200',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      };

      const [dRes, wRes] = await Promise.all([
        apiService.getAdminDeposits(params),
        apiService.getAdminWithdrawals(params),
      ]);

      if (dRes.success && dRes.data) {
        setDeposits(dRes.data.items || []);
      }
      if (wRes.success && wRes.data) {
        setWithdrawals(wRes.data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch wallet requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const handleAction = async (
    type: 'deposit' | 'withdrawal',
    id: string,
    action: 'approve' | 'reject',
    adminNote?: string,
  ) => {
    if (action === 'reject' && !adminNote) {
      setRejectionModal({ id, type });
      return;
    }

    setProcessing(id);
    try {
      const res = await apiService.processAdminTransaction(id, action, adminNote);
      if (res.success) {
        await fetchData();
        setRejectionModal(null);
        setRejectionRemark('');
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
          onClick={() => setTab('deposits')}
          className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            tab === 'deposits'
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          Deposits
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
            {deposits.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('withdrawals')}
          className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            tab === 'withdrawals'
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          Withdrawals
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
            {withdrawals.length}
          </span>
        </button>
      </div>

      {tab === 'deposits' && (
        <SectionCard title="Deposit Requests" description="Approve or reject user deposits after verifying payment proof." noPadding>
          <TabulatorTable
            columns={[
              { key: 'amount', label: 'Amount', width: '120', hozAlign: 'right' as const, sortable: true, render: (v: any) => `₹${Number(v).toLocaleString()}` },
              {
                key: 'status',
                label: 'Status',
                width: '160',
                hozAlign: 'center' as const,
                render: (v: any) => <Badge variant={STATUS_COLORS[v] || 'info'}>{v}</Badge>,
              },
              { key: 'user', label: 'User Mobile', width: '160', render: (_: any, row: any) => row.user?.mobile || '-' },
              {
                key: 'proofImageUrl',
                label: 'Proof',
                width: '100',
                hozAlign: 'center' as const,
                headerSort: false,
                excludeFromExport: true,
                render: (v: any, row: any) => v ? (
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setPreviewRequest(row); }}
                    className="text-cyan-400 underline text-xs font-medium hover:text-cyan-300"
                  >
                    View Proof
                  </button>
                ) : <span className="text-slate-500 text-xs">-</span>
              },
              {
                key: 'createdAt',
                label: 'Requested',
                width: '160',
                exportFormat: (v: any) => new Date(v).toLocaleString(),
                render: (v: any) => new Date(v).toLocaleString(),
              },
              {
                key: 'id',
                label: 'Actions',
                width: '200',
                hozAlign: 'center' as const,
                headerSort: false,
                render: (_: any, d: any) => (d.status === 'PENDING' || d.status === 'WAITING_APPROVAL') ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processing === d.id}
                      onClick={() => handleAction('deposit', d.id, 'approve')}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={processing === d.id}
                      onClick={() => handleAction('deposit', d.id, 'reject')}
                      className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : <span className="text-slate-500 text-xs">Processed</span>
              }
            ]}
            data={deposits}
            loading={loading}
            paginationSize={20}
            title="Deposit_Requests"
          />
        </SectionCard>
      )}

      {tab === 'withdrawals' && (
        <SectionCard title="Withdrawal Requests" description="Pay the user externally first, then mark as paid here." noPadding>
          <TabulatorTable
            columns={[
              { key: 'amount', label: 'Amount', width: '120', hozAlign: 'right' as const, sortable: true, render: (v: any) => `₹${Number(v).toLocaleString()}` },
              {
                key: 'status',
                label: 'Status',
                width: '160',
                hozAlign: 'center' as const,
                render: (v: any) => <Badge variant={STATUS_COLORS[v] || 'info'}>{v}</Badge>,
              },
              { key: 'user', label: 'User Mobile', width: '160', render: (_: any, row: any) => row.user?.mobile || '-' },
              { key: 'upiOrAccount', label: 'Payment Info', width: '220', render: (v: any) => <code className="text-xs text-slate-300">{v || '-'}</code> },
              {
                key: 'createdAt',
                label: 'Requested',
                width: '160',
                render: (v: any) => new Date(v).toLocaleString(),
              },
              {
                key: 'id',
                label: 'Actions',
                width: '200',
                hozAlign: 'center' as const,
                headerSort: false,
                render: (_: any, w: any) => w.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processing === w.id}
                      onClick={() => handleAction('withdrawal', w.id, 'approve')}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Mark Paid
                    </button>
                    <button
                      type="button"
                      disabled={processing === w.id}
                      onClick={() => handleAction('withdrawal', w.id, 'reject')}
                      className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : <span className="text-slate-500 text-xs">Processed</span>
              }
            ]}
            data={withdrawals}
            loading={loading}
            paginationSize={20}
            title="Withdrawal_Requests"
          />
        </SectionCard>
      )}
      <Modal
        isOpen={Boolean(previewRequest)}
        onClose={() => setPreviewRequest(null)}
        title="Deposit Verification"
        description="Review the payment proof and user details before making a decision."
      >
        {previewRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-900/50 p-5 border border-white/5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Requested Amount</p>
                <p className="text-2xl font-bold text-white mt-1">₹{previewRequest.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">User Mobile</p>
                <p className="text-lg font-bold text-white mt-1">{previewRequest.user?.mobile || '-'}</p>
                <p className="text-xs text-slate-400 mt-0.5">Current Bal: ₹{previewRequest.user?.balance.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex justify-center items-center min-h-[200px] p-2">
              <img 
                src={`${apiService.getApiBase()}${previewRequest.proofImageUrl}`} 
                alt="Payment Proof" 
                className="max-h-[50vh] object-contain rounded-lg"
              />
            </div>

            {(previewRequest.status === 'PENDING' || previewRequest.status === 'WAITING_APPROVAL') && (
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  disabled={processing === previewRequest.id}
                  onClick={() => {
                     handleAction('deposit', previewRequest.id, 'approve');
                     setPreviewRequest(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-500/20 py-3.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  {processing === previewRequest.id ? 'Processing...' : 'Approve Deposit'}
                </button>
                <button
                  type="button"
                  disabled={processing === previewRequest.id}
                  onClick={() => {
                     handleAction('deposit', previewRequest.id, 'reject');
                  }}
                  className="flex-1 rounded-xl bg-rose-500/20 py-3.5 text-sm font-bold text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(rejectionModal)}
        onClose={() => { setRejectionModal(null); setRejectionRemark(''); }}
        title="Reject Request"
        description="Please provide a reason for rejecting this request. This will be shown to the user."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Remark / Reason</label>
            <textarea
              value={rejectionRemark}
              onChange={(e) => setRejectionRemark(e.target.value)}
              placeholder="e.g. Invalid proof, Payment not received, Incorrect account details..."
              className="w-full h-24 rounded-xl bg-slate-900 border border-white/10 p-4 text-sm text-white focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setRejectionModal(null); setRejectionRemark(''); }}
              className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectionRemark.trim() || processing !== null}
              onClick={() => {
                if (rejectionModal) {
                  handleAction(rejectionModal.type, rejectionModal.id, 'reject', rejectionRemark);
                  setPreviewRequest(null);
                }
              }}
              className="flex-2 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

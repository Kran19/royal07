'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Badge, SectionCard, TabulatorTable, Modal } from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { cn } from "../../../lib/utils";

type DepositRequest = {
  id: string;
  userId: string;
  amount: number;
  proofImageUrl?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  isWithdrawalProof: any;
  user: { name: string; mobile: string; balance: number };
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
  user: { name: string; mobile: string; balance: number };
  metadata?: { adminProofUrl?: string; [key: string]: any };
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
  const [actionModal, setActionModal] = useState<{ id: string; type: 'deposit' | 'withdrawal'; actionType: 'approve' | 'reject' } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminProofFile, setAdminProofFile] = useState<File | null>(null);

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
    note?: string,
    proofFile?: File | null
  ) => {
    if (note === undefined) {
      setActionModal({ id, type, actionType: action });
      return;
    }

    setProcessing(id);
    try {
      const res = await apiService.processAdminTransaction(id, action, note, proofFile);
      if (res.success) {
        await fetchData();
        setActionModal(null);
        setAdminNote('');
        setAdminProofFile(null);
      }
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setProcessing(null);
    }
  };

  const CustomWalletToolbar = (
    <div className={cn('flex', 'w-full', 'flex-col', 'gap-4', 'lg:flex-row', 'lg:items-center', 'lg:justify-between', 'pr-4')}>
      
      {/* Left: Tabs & Filters (Pill Group) */}
      <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-2', 'rounded-full', 'bg-slate-50', 'p-1.5', 'shadow-sm', 'border', 'border-slate-200', 'dark:border-slate-800', 'dark:bg-slate-900/50')}>
        <button
          type="button"
          onClick={() => setTab('deposits')}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-all ${
            tab === 'deposits'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Deposits
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === 'deposits' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-slate-200/50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
            {deposits.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('withdrawals')}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-all ${
            tab === 'withdrawals'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Withdrawals
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tab === 'withdrawals' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-slate-200/50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
            {withdrawals.length}
          </span>
        </button>
        
        <div className={cn('h-5', 'w-px', 'bg-slate-200', 'dark:bg-slate-700', 'mx-1')}></div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn('rounded-full', 'bg-transparent', 'px-4', 'py-1.5', 'text-sm', 'font-medium', 'text-slate-600', 'outline-none', 'hover:text-slate-900', 'dark:text-slate-300', 'dark:hover:text-white', 'cursor-pointer')}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="WAITING_APPROVAL">Waiting Proof</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Rejected</option>
        </select>
      </div>

      {/* Right: Search */}
      <div className={cn('relative', 'w-full', 'lg:w-80')}>
        <span className={cn('pointer-events-none', 'absolute', 'inset-y-0', 'left-4', 'flex', 'items-center', 'text-slate-400')}>
          <svg className={cn('h-4', 'w-4')} viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M14.5 14.5L18 18M8.5 15A6.5 6.5 0 108.5 2a6.5 6.5 0 000 13z" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search by user mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn('h-10', 'w-full', 'rounded-full', 'border', 'border-slate-200', 'bg-white', 'pl-11', 'pr-4', 'text-sm', 'text-slate-900', 'placeholder:text-slate-400', 'shadow-sm', 'outline-none', 'transition-all', 'focus:border-indigo-500', 'focus:ring-4', 'focus:ring-indigo-500/10', 'dark:border-slate-800', 'dark:bg-slate-900/50', 'dark:text-white', 'dark:focus:border-indigo-400', 'dark:focus:ring-indigo-400/10')}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Wallet requests"
        description="Review and process user deposit and withdrawal requests."
      />

      {tab === 'deposits' && (
        <TabulatorTable
          columns={[
            { key: 'amount', label: 'Amount', width: '100', hozAlign: 'right' as const, sortable: true, render: (v: any) => `₹${Number(v).toLocaleString()}` },
            {
              key: 'status',
              label: 'Status',
              width: '120',
              hozAlign: 'center' as const,
              render: (v: any) => <Badge variant={STATUS_COLORS[v] || 'info'}>{v}</Badge>,
            },
            { key: 'user', label: 'User', width: '160', render: (_: any, row: any) => (
              <div className={cn('flex', 'flex-col')}>
                <span className="font-semibold">{row.user?.username || '-'}</span>
                <span className={cn('text-[11px]', 'text-slate-500')}>{row.user?.mobile || '-'}</span>
              </div>
            )},
            { key: 'balance', label: 'User Balance', width: '120', hozAlign: 'right' as const, render: (_: any, row: any) => `₹${Number(row.user?.balance || 0).toLocaleString()}` },
            {
              key: 'adminRemark',
              label: 'Admin Note',
              render: (v: any) => v ? <span className={cn('text-xs', 'text-slate-500', 'italic')}>{v}</span> : '-'
            },
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
                  className={cn('text-cyan-600', 'underline', 'text-xs', 'font-semibold', 'hover:text-cyan-500', 'dark:text-cyan-400', 'dark:hover:text-cyan-300')}
                >
                  View Proof
                </button>
              ) : <span className={cn('text-slate-400', 'text-xs')}>-</span>
            },
            {
              key: 'createdAt',
              label: 'Requested',
              width: '140',
              exportFormat: (v: any) => new Date(v).toLocaleString(),
              render: (v: any) => new Date(v).toLocaleString(),
            },
            {
              key: 'id',
              label: 'Actions',
              width: '180',
              hozAlign: 'center' as const,
              headerSort: false,
              render: (_: any, d: any) => (d.status === 'PENDING' || d.status === 'WAITING_APPROVAL') ? (
                <div className={cn('flex', 'justify-center', 'gap-2')}>
                  <button
                    type="button"
                    disabled={processing === d.id}
                    onClick={() => handleAction('deposit', d.id, 'approve')}
                    className={cn('rounded-full', 'bg-emerald-100', 'px-3', 'py-1', 'text-xs', 'font-bold', 'text-emerald-700', 'hover:bg-emerald-200', 'dark:bg-emerald-500/20', 'dark:text-emerald-300', 'dark:hover:bg-emerald-500/30', 'disabled:opacity-50', 'transition-colors')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={processing === d.id}
                    onClick={() => handleAction('deposit', d.id, 'reject')}
                    className={cn('rounded-full', 'bg-rose-100', 'px-3', 'py-1', 'text-xs', 'font-bold', 'text-rose-700', 'hover:bg-rose-200', 'dark:bg-rose-500/20', 'dark:text-rose-300', 'dark:hover:bg-rose-500/30', 'disabled:opacity-50', 'transition-colors')}
                  >
                    Reject
                  </button>
                </div>
              ) : <span className={cn('text-slate-400', 'text-xs', 'font-medium')}>Processed</span>
            }
          ]}
          data={deposits}
          loading={loading}
          paginationSize={20}
          title="Deposit_Requests"
          showSearch={false}
          customToolbar={CustomWalletToolbar}
        />
      )}

      {tab === 'withdrawals' && (
        <TabulatorTable
          columns={[
            { key: 'amount', label: 'Amount', width: '100', hozAlign: 'right' as const, sortable: true, render: (v: any) => `₹${Number(v).toLocaleString()}` },
            {
              key: 'status',
              label: 'Status',
              width: '120',
              hozAlign: 'center' as const,
              render: (v: any) => <Badge variant={STATUS_COLORS[v] || 'info'}>{v}</Badge>,
            },
            { key: 'user', label: 'User', width: '160', render: (_: any, row: any) => (
              <div className={cn('flex', 'flex-col')}>
                <span className="font-semibold">{row.user?.username || '-'}</span>
                <span className={cn('text-[11px]', 'text-slate-500')}>{row.user?.mobile || '-'}</span>
              </div>
            )},
            { key: 'balance', label: 'User Balance', width: '120', hozAlign: 'right' as const, render: (_: any, row: any) => `₹${Number(row.user?.balance || 0).toLocaleString()}` },
            { key: 'upiOrAccount', label: 'Payment Info', width: '160', render: (v: any) => <code className={cn('text-xs', 'text-slate-500', 'dark:text-slate-300', 'font-medium', 'bg-slate-100', 'dark:bg-slate-800', 'px-2', 'py-1', 'rounded-md')}>{v || '-'}</code> },
            {
              key: 'adminRemark',
              label: 'Admin Note',
              render: (v: any) => v ? <span className={cn('text-xs', 'text-slate-500', 'italic')}>{v}</span> : '-'
            },
            {
              key: 'adminProofUrl',
              label: 'Admin Proof',
              width: '100',
              hozAlign: 'center' as const,
              render: (_: any, row: any) => row.metadata?.adminProofUrl ? (
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); setPreviewRequest({ ...row, proofImageUrl: row.metadata.adminProofUrl, isWithdrawalProof: true } as any); }}
                  className={cn('text-cyan-600', 'underline', 'text-xs', 'font-semibold', 'hover:text-cyan-500', 'dark:text-cyan-400', 'dark:hover:text-cyan-300')}
                >
                  View Proof
                </button>
              ) : <span className={cn('text-slate-400', 'text-xs')}>-</span>
            },
            {
              key: 'createdAt',
              label: 'Requested',
              width: '140',
              render: (v: any) => new Date(v).toLocaleString(),
            },
            {
              key: 'id',
              label: 'Actions',
              width: '180',
              hozAlign: 'center' as const,
              headerSort: false,
              render: (_: any, w: any) => w.status === 'PENDING' ? (
                <div className={cn('flex', 'justify-center', 'gap-2')}>
                  <button
                    type="button"
                    disabled={processing === w.id}
                    onClick={() => handleAction('withdrawal', w.id, 'approve')}
                    className={cn('rounded-full', 'bg-emerald-100', 'px-3', 'py-1', 'text-xs', 'font-bold', 'text-emerald-700', 'hover:bg-emerald-200', 'dark:bg-emerald-500/20', 'dark:text-emerald-300', 'dark:hover:bg-emerald-500/30', 'disabled:opacity-50', 'transition-colors')}
                  >
                    Mark Paid
                  </button>
                  <button
                    type="button"
                    disabled={processing === w.id}
                    onClick={() => handleAction('withdrawal', w.id, 'reject')}
                    className={cn('rounded-full', 'bg-rose-100', 'px-3', 'py-1', 'text-xs', 'font-bold', 'text-rose-700', 'hover:bg-rose-200', 'dark:bg-rose-500/20', 'dark:text-rose-300', 'dark:hover:bg-rose-500/30', 'disabled:opacity-50', 'transition-colors')}
                  >
                    Reject
                  </button>
                </div>
              ) : <span className={cn('text-slate-400', 'text-xs', 'font-medium')}>Processed</span>
            }
          ]}
          data={withdrawals}
          loading={loading}
          paginationSize={20}
          title="Withdrawal_Requests"
          showSearch={false}
          customToolbar={CustomWalletToolbar}
        />
      )}
      <Modal
        isOpen={Boolean(previewRequest)}
        onClose={() => setPreviewRequest(null)}
        title={previewRequest?.isWithdrawalProof ? "Admin Transfer Proof" : "Deposit Verification"}
        description={previewRequest?.isWithdrawalProof ? "View the transfer proof provided by the admin for this withdrawal." : "Review the payment proof and user details before making a decision."}
      >
        {previewRequest && (
          <div className="space-y-4">
            <div className={cn('grid', 'grid-cols-2', 'gap-4', 'rounded-[16px]', 'bg-slate-50', 'dark:bg-slate-900/50', 'p-5', 'border', 'border-slate-200', 'dark:border-slate-800')}>
              <div>
                <p className={cn('text-xs', 'uppercase', 'tracking-wider', 'text-slate-500', 'font-bold')}>Requested Amount</p>
                <p className={cn('text-2xl', 'font-bold', 'text-slate-900', 'dark:text-white', 'mt-1')}>₹{previewRequest.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-xs', 'uppercase', 'tracking-wider', 'text-slate-500', 'font-bold')}>User Mobile</p>
                <p className={cn('text-lg', 'font-bold', 'text-slate-900', 'dark:text-white', 'mt-1')}>{previewRequest.user?.mobile || '-'}</p>
                <p className={cn('text-xs', 'text-slate-500', 'dark:text-slate-400', 'mt-0.5')}>Current Bal: ₹{previewRequest.user?.balance.toLocaleString()}</p>
              </div>
            </div>
            
            <div className={cn('rounded-xl', 'overflow-hidden', 'border', 'border-white/10', 'bg-slate-900', 'flex', 'justify-center', 'items-center', 'min-h-[200px]', 'p-2')}>
              <img 
                src={`${apiService.getApiBase()}${previewRequest.proofImageUrl}`} 
                alt="Payment Proof" 
                className={cn('max-h-[50vh]', 'object-contain', 'rounded-lg')}
              />
            </div>

            {(previewRequest.status === 'PENDING' || previewRequest.status === 'WAITING_APPROVAL') && !previewRequest.isWithdrawalProof && (
              <div className={cn('flex', 'gap-3')}>
                <button
                  type="button"
                  disabled={processing === previewRequest.id}
                  onClick={() => handleAction('deposit', previewRequest.id, 'approve')}
                  className={cn('flex-2', 'rounded-xl', 'bg-emerald-500', 'py-3.5', 'text-sm', 'font-bold', 'text-white', 'hover:bg-emerald-600', 'transition-colors', 'shadow-[0_4px_12px_rgba(16,185,129,0.3)]', 'disabled:opacity-50')}
                >
                  {processing === previewRequest.id ? 'Processing...' : 'Approve Deposit'}
                </button>
                <button
                  type="button"
                  disabled={processing === previewRequest.id}
                  onClick={() => handleAction('deposit', previewRequest.id, 'reject')}
                  className={cn('flex-1', 'rounded-xl', 'bg-rose-500', 'py-3.5', 'text-sm', 'font-bold', 'text-white', 'hover:bg-rose-600', 'transition-colors', 'shadow-[0_4px_12px_rgba(244,63,94,0.3)]', 'disabled:opacity-50')}
                >
                  Reject
                </button>
              </div>
            )}

            {previewRequest.isWithdrawalProof && (
              <div className={cn('flex', 'justify-end')}>
                <button
                  type="button"
                  onClick={() => setPreviewRequest(null)}
                  className={cn('px-6', 'py-3', 'rounded-xl', 'bg-slate-100', 'dark:bg-slate-800', 'text-sm', 'font-bold', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-700', 'transition-colors')}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => { setActionModal(null); setAdminNote(''); setAdminProofFile(null); }}
        title={actionModal?.actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        description={`Please provide a reason or note for ${actionModal?.actionType === 'approve' ? 'approving' : 'rejecting'} this request. This will be shown to the user.`}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={cn('text-xs', 'uppercase', 'font-bold', 'text-slate-500', 'tracking-wider')}>Remark / Admin Note {actionModal?.actionType === 'approve' && '(Optional)'}</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionModal?.actionType === 'approve' ? "e.g. Approved quickly, Paid via UPI..." : "e.g. Invalid proof, Payment not received, Incorrect account details..."}
                className={`w-full h-24 rounded-[16px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 ${
                  actionModal?.actionType === 'approve' 
                    ? 'focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10'
                    : 'focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10'
                }`}
              />
          </div>
          
          {actionModal?.actionType === 'approve' && actionModal?.type === 'withdrawal' && (
            <div className="space-y-1.5">
              <label className={cn('text-xs', 'uppercase', 'font-bold', 'text-slate-500', 'tracking-wider')}>Transfer Proof (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAdminProofFile(e.target.files?.[0] || null)}
                className={cn('block', 'w-full', 'text-sm', 'text-slate-500', 'file:mr-4', 'file:py-2', 'file:px-4', 'file:rounded-full', 'file:border-0', 'file:text-sm', 'file:font-semibold', 'file:bg-emerald-50', 'file:text-emerald-700', 'hover:file:bg-emerald-100', 'dark:file:bg-emerald-500/20', 'dark:file:text-emerald-300', 'dark:hover:file:bg-emerald-500/30')}
              />
            </div>
          )}

          <div className={cn('flex', 'gap-3', 'pt-2')}>
            <button
              type="button"
              onClick={() => { setActionModal(null); setAdminNote(''); setAdminProofFile(null); }}
              className={cn('flex-1', 'rounded-[16px]', 'bg-slate-100', 'dark:bg-slate-800', 'py-3', 'text-sm', 'font-bold', 'text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200', 'dark:hover:bg-slate-700', 'transition-colors')}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={(actionModal?.actionType === 'reject' && !adminNote.trim()) || processing !== null}
              onClick={() => {
                if (actionModal) {
                  handleAction(actionModal.type, actionModal.id, actionModal.actionType, adminNote, adminProofFile);
                  setPreviewRequest(null);
                }
              }}
              className={`flex-2 rounded-[16px] py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                actionModal?.actionType === 'approve'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.3)]'
              }`}
            >
              {processing ? 'Processing...' : (actionModal?.actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  FilterPanel,
  Select,
  Badge,
  PageHeader,
  SectionCard,
  TabulatorTable,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { Transaction, TransactionStatus, TransactionType } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [search, setSearch] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTransactionHistory(1, 200, search, filters.type, filters.status);
      if (response.success && response.data) {
        const items = response.data.items || response.data;
        setTransactions(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchTransactions(), 500);
    return () => clearTimeout(handler);
  }, [filters, search]);

  const handleTransactionAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this transaction?`)) return;
    try {
      const res = await apiService.processAdminTransaction(id, action);
      if (res.success) {
        fetchTransactions();
      } else {
        alert(res.error || `Failed to ${action} transaction`);
      }
    } catch (err) {
      alert(`Error processing transaction`);
    }
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
      case TransactionType.BET_WON:
        return 'success';
      case TransactionType.WITHDRAWAL:
        return 'warning';
      case TransactionType.ADJUSTMENT:
        return 'purple';
      default:
        return 'info';
    }
  };

  const CustomTransactionsToolbar = (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pr-4">
      {/* Left: Inline Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.type}
          onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}
          className="h-10 rounded-full border border-slate-200 bg-white px-4 pr-8 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
        >
          <option value="">All Types</option>
          <option value={TransactionType.DEPOSIT}>Deposit</option>
          <option value={TransactionType.WITHDRAWAL}>Withdrawal</option>
          <option value={TransactionType.BET_PLACED}>Bet Placed</option>
          <option value={TransactionType.BET_WON}>Bet Won</option>
        </select>
        
        <select
          value={filters.status}
          onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
          className="h-10 rounded-full border border-slate-200 bg-white px-4 pr-8 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
        >
          <option value="">All Statuses</option>
          <option value={TransactionStatus.COMPLETED}>Completed</option>
          <option value={TransactionStatus.PENDING}>Pending</option>
          <option value={TransactionStatus.FAILED}>Failed</option>
        </select>
      </div>

      {/* Right: Search Bar */}
      <div className="relative w-full lg:max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M14.5 14.5L18 18M8.5 15A6.5 6.5 0 108.5 2a6.5 6.5 0 000 13z" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search by ID or User Mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
        />
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Wallet"
        title="Transactions"
        description="Monitor financial flows across the platform."
      />

      <div className="mt-2">
        <TabulatorTable
          columns={[
            {
              key: 'user',
              label: 'User Info',
              render: (v: any, row: any) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {row.user?.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {row.user?.mobile || row.userId || 'No Mobile'}
                  </span>
                  <code className="text-[10px] text-slate-400 mt-0.5">{row.id}</code>
                </div>
              ),
            },
            {
              key: 'reference',
              label: 'Reference',
              render: (v: any, row: any) => row.reference ? <code className="text-xs text-slate-500">{row.reference}</code> : <span className="text-slate-400">-</span>,
            },
            {
              key: 'type',
              label: 'Type',
              hozAlign: 'center',
              render: (value: any) => <Badge variant={getTypeColor(value as TransactionType)}>{String(value)}</Badge>,
            },
            {
              key: 'amount',
              label: 'Amount',
              hozAlign: 'right',
              sortable: true,
              render: (value: any, row: any) => {
                const isCredit = row.type === 'DEPOSIT' || row.type === 'BET_WON' || row.type === 'ADJUSTMENT_CREDIT';
                const sign = isCredit ? '+' : '-';
                const color = isCredit ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold';
                return (
                  <div className="flex flex-col items-end">
                    <span className={color}>
                      {sign}₹{Math.abs(Number(value)).toLocaleString()}
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'balance',
              label: 'Balances',
              hozAlign: 'right',
              render: (value: any, row: any) => {
                if (row.balanceBefore == null || row.balanceAfter == null) return <span className="text-slate-400 text-xs">-</span>;
                return (
                  <div className="flex flex-col items-end text-[10px] text-slate-500 font-mono">
                    <span>Pre: ₹{Number(row.balanceBefore).toLocaleString()}</span>
                    <span>Post: ₹{Number(row.balanceAfter).toLocaleString()}</span>
                  </div>
                );
              }
            },
            {
              key: 'description',
              label: 'Details',
              render: (v: any, row: any) => (
                <div className="flex flex-col">
                  {v ? <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{String(v)}</span> : <span className="text-slate-400 text-xs">-</span>}
                  {row.adminRemark && <span className="text-indigo-500 text-[10px] mt-0.5">Admin: {row.adminRemark}</span>}
                </div>
              )
            },
            {
              key: 'status',
              label: 'Status',
              hozAlign: 'center',
              render: (value: any) => (
                <Badge
                  variant={
                    value === TransactionStatus.COMPLETED
                      ? 'success'
                      : value === TransactionStatus.FAILED
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {String(value)}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (value: any) => (
                <div className="flex flex-col text-xs text-slate-500">
                  <span>{new Date(value as Date).toLocaleDateString()}</span>
                  <span>{new Date(value as Date).toLocaleTimeString()}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              hozAlign: 'center',
              render: (v: any, row: any) => {
                if (row.status !== TransactionStatus.PENDING) return <span className="text-slate-400 text-xs">-</span>;
                return (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleTransactionAction(row.id, 'approve')}
                      className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 text-xs font-semibold"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleTransactionAction(row.id, 'reject')}
                      className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 text-xs font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                );
              }
            },
          ]}
          data={transactions}
          loading={loading}
          paginationSize={20}
          title="Transactions"
          customToolbar={CustomTransactionsToolbar}
        />
      </div>
    </>
  );
}

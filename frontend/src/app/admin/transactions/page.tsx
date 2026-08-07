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
              key: 'id',
              label: 'ID',
              sortable: true,
              width: '160',
              render: (v: any) => <code className="text-xs text-slate-400">{String(v).slice(-8).toUpperCase()}</code>
            },
            { key: 'userId', label: 'User', sortable: true, width: '180', render: (v: any) => String(v).slice(-8) },
            {
              key: 'type',
              label: 'Type',
              width: '160',
              hozAlign: 'center',
              render: (value: any) => <Badge variant={getTypeColor(value as TransactionType)}>{String(value)}</Badge>,
            },
            {
              key: 'amount',
              label: 'Amount',
              width: '140',
              hozAlign: 'right',
              sortable: true,
              render: (value: any, row: any) => {
                const isCredit = row.type === 'DEPOSIT' || row.type === 'BET_WON' || row.type === 'ADJUSTMENT_CREDIT';
                const sign = isCredit ? '+' : '-';
                const color = isCredit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
                return (
                  <span className={color}>
                    {sign}₹{Math.abs(Number(value)).toLocaleString()}
                  </span>
                );
              },
            },
            {
              key: 'description',
              label: 'Details',
              width: '280',
              render: (v: any) => v ? <span className="text-slate-300 text-xs">{String(v)}</span> : <span className="text-slate-600 text-xs">-</span>
            },
            {
              key: 'status',
              label: 'Status',
              width: '150',
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
              width: '160',
              render: (value: any) => new Date(value as Date).toLocaleTimeString(),
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

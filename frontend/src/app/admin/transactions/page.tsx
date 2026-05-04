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

  return (
    <>
      <PageHeader
        eyebrow="Wallet"
        title="Transactions"
        description="Monitor financial flows across the platform."
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M14.5 14.5L18 18M8.5 15A6.5 6.5 0 108.5 2a6.5 6.5 0 000 13z" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by ID or User Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filters
        </button>
      </div>

      <SectionCard title="All transactions" description="Chronological record of credits and debits with pagination." noPadding>
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
        />
      </SectionCard>

      <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter transactions">
        <div className="space-y-4">
          <Select
            label="Type"
            options={[
              { value: TransactionType.DEPOSIT, label: 'Deposit' },
              { value: TransactionType.WITHDRAWAL, label: 'Withdrawal' },
              { value: TransactionType.BET_PLACED, label: 'Bet placed' },
              { value: TransactionType.BET_WON, label: 'Bet won' },
            ]}
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          />
          <Select
            label="Status"
            options={[
              { value: TransactionStatus.COMPLETED, label: 'Completed' },
              { value: TransactionStatus.PENDING, label: 'Pending' },
              { value: TransactionStatus.FAILED, label: 'Failed' },
            ]}
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          />
        </div>
      </FilterPanel>
    </>
  );
}

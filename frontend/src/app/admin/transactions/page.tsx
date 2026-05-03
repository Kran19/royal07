'use client';

import { useEffect, useState } from 'react';
import {
  DataTable,
  FilterPanel,
  Button,
  Input,
  Select,
  Badge,
  Pagination,
  PageHeader,
  SectionCard,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { Transaction, TransactionStatus, TransactionType, PaginatedResponse } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', status: '' });

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await apiService.getTransactionHistory(currentPage, 20);
        if (response.success && response.data) {
          setTransactions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentPage, filters]);

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

      <SectionCard title="All transactions" description="Chronological record of credits and debits." noPadding>
        <DataTable
          columns={[
            { key: 'id', label: 'ID', sortable: true, width: '160px', render: (v) => String(v).slice(-8).toUpperCase() },
            { key: 'userId', label: 'User', sortable: true, width: '180px', render: (v) => String(v).slice(-8) },
            {
              key: 'type',
              label: 'Type',
              width: '160px',
              render: (value) => <Badge variant={getTypeColor(value as TransactionType)}>{String(value)}</Badge>,
            },
            {
              key: 'amount',
              label: 'Amount',
              width: '140px',
              render: (value) => (
                <span className={Number(value) > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {Number(value) > 0 ? '+' : ''}₹{Number(value).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '150px',
              render: (value) => (
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
              width: '160px',
              render: (value) => new Date(value as Date).toLocaleTimeString(),
            },
          ]}
          data={transactions?.items || []}
          loading={loading}
          actions={
            <Button variant="secondary" onClick={() => setFilterOpen(true)}>
              Advanced Filters
            </Button>
          }
        />

        {transactions ? (
          <Pagination
            currentPage={transactions.page}
            totalPages={transactions.pages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        ) : null}
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

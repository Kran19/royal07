'use client';

import { useEffect, useState } from 'react';
import {
  DataTable,
  DetailDrawer,
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
import { Bet, BetType, BetStatus, PaginatedResponse } from '@/types';

export default function BetsPage() {
  const [bets, setBets] = useState<PaginatedResponse<Bet> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', type: '' });

  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      try {
        const response = await apiService.getAllBets(currentPage, 20, {
          status: filters.status,
          type: filters.type,
        });
        if (response.success && response.data) {
          setBets(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch bets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [currentPage, filters]);

  const getStatusColor = (status: BetStatus) => {
    switch (status) {
      case BetStatus.SETTLED:
        return 'success';
      case BetStatus.CANCELLED:
        return 'danger';
      default:
        return 'cyan';
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Wagering"
        title="Bet operations"
        description="Monitor all bets placed across the 60-second automated rounds."
      />

      <SectionCard title="All bets" description="Search and inspect every ticket in the house." noPadding>
        <div className="flex flex-col gap-4 border-b border-white/5 p-6 lg:flex-row">
          <div className="flex-1">
            <Input placeholder="Search by user ID or bet ID" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => setFilterOpen(true)}>
              Filters
            </Button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'id', label: 'Bet ID', sortable: true, width: '160px', render: (v) => String(v).slice(-8).toUpperCase() },
            {
              key: 'userId',
              label: 'User',
              sortable: true,
              width: '180px',
              render: (_, row) => row.user?.mobile || String(row.userId).slice(-8),
            },
            {
              key: 'betType',
              label: 'Type',
              width: '140px',
              render: (value) => <Badge variant="cyan">{String(value)}</Badge>,
            },
            {
              key: 'status',
              label: 'Status',
              width: '150px',
              render: (value) => <Badge variant={getStatusColor(value as BetStatus)}>{String(value)}</Badge>,
            },
            { key: 'amount', label: 'Stake', width: '130px', render: (value) => `₹${Number(value).toLocaleString()}` },
            { key: 'settlementAmount', label: 'Payout', width: '130px', render: (value) => value ? `₹${Number(value).toLocaleString()}` : '-' },
            {
              key: 'createdAt',
              label: 'Created',
              width: '160px',
              render: (value) => new Date(value as Date).toLocaleTimeString(),
            },
          ]}
          data={bets?.items || []}
          loading={loading}
          onRowClick={(bet) => {
            setSelectedBet(bet);
            setDetailOpen(true);
          }}
        />

        {bets ? (
          <Pagination
            currentPage={bets.page}
            totalPages={bets.pages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        ) : null}
      </SectionCard>

      <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter bets">
        <div className="space-y-4">
          <Select
            label="Status"
            options={[
              { value: BetStatus.SETTLED, label: 'Settled' },
              { value: BetStatus.ACTIVE, label: 'Active' },
              { value: BetStatus.CANCELLED, label: 'Cancelled' },
            ]}
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          />
          <Select
            label="Type"
            options={[
              { value: BetType.SINGLE, label: 'Single' },
              { value: BetType.PAIR, label: 'Pair' },
              { value: BetType.TRIPLE, label: 'Triple' },
              { value: BetType.QUAD, label: 'Quad' },
            ]}
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          />
        </div>
      </FilterPanel>

      <DetailDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedBet ? `Bet #${selectedBet.id.slice(-8).toUpperCase()}` : 'Bet details'}
        size="lg"
      >
        {selectedBet ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard label="User" value={selectedBet.user?.mobile || selectedBet.userId} />
              <InfoCard label="Type" value={<Badge variant="cyan">{selectedBet.betType}</Badge>} />
              <InfoCard label="Status" value={<Badge variant={getStatusColor(selectedBet.status)}>{selectedBet.status}</Badge>} />
              <InfoCard label="Round" value={selectedBet.round?.roundNumber ? `#${selectedBet.round.roundNumber}` : selectedBet.roundId} />
            </div>

            <DrawerSection title="Financial summary">
              <MetricRow label="Stake" value={`₹${selectedBet.amount.toLocaleString()}`} />
              <MetricRow label="Payout" value={selectedBet.settlementAmount ? `₹${selectedBet.settlementAmount.toLocaleString()}` : 'Pending'} />
              <MetricRow label="Numbers" value={selectedBet.numbers.join(', ')} />
            </DrawerSection>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
      <h3 className="mb-5 text-lg font-bold tracking-tight text-white">{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3.5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

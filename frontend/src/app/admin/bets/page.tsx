'use client';

import { useEffect, useState } from 'react';
import {
  DetailDrawer,
  FilterPanel,
  Button,
  Select,
  Badge,
  PageHeader,
  SectionCard,
  TabulatorTable,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { Bet, BetType, BetStatus } from '@/types';

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', type: '' });

  const fetchBets = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAllBets(1, 200, {
        status: filters.status,
        type: filters.type,
      });
      if (response.success && response.data) {
        setBets(response.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch bets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [filters]);

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

      <SectionCard title="All bets" description="Search and inspect every ticket in the house with pagination." noPadding>
        <TabulatorTable
          columns={[
            {
              key: 'id',
              label: 'Bet ID',
              sortable: true,
              width: '160',
              render: (v: any) => <code className="text-xs text-slate-400">{String(v).slice(-8).toUpperCase()}</code>
            },
            {
              key: 'userId',
              label: 'User',
              sortable: true,
              width: '180',
              render: (_: any, row: Bet) => row.user?.mobile || String(row.userId).slice(-8),
            },
            {
              key: 'betType',
              label: 'Type',
              width: '140',
              hozAlign: 'center',
              render: (value: any) => <Badge variant="cyan">{String(value)}</Badge>,
            },
            {
              key: 'status',
              label: 'Status',
              width: '150',
              hozAlign: 'center',
              render: (value: any) => <Badge variant={getStatusColor(value as BetStatus)}>{String(value)}</Badge>,
            },
            {
              key: 'amount',
              label: 'Stake',
              width: '130',
              hozAlign: 'right',
              sortable: true,
              render: (value: any) => `₹${Number(value).toLocaleString()}`
            },
            {
              key: 'settlementAmount',
              label: 'Payout',
              width: '130',
              hozAlign: 'right',
              render: (value: any) => value ? `₹${Number(value).toLocaleString()}` : '-'
            },
            {
              key: 'createdAt',
              label: 'Created',
              width: '160',
              render: (value: any) => new Date(value as Date).toLocaleTimeString(),
            },
          ]}
          data={bets}
          loading={loading}
          onRowClick={(bet) => {
            setSelectedBet(bet);
            setDetailOpen(true);
          }}
          paginationSize={20}
          title="Bet_Operations"
        />
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

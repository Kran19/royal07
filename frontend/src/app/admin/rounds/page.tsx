'use client';

import { useEffect, useState } from 'react';
import {
  DataTable,
  DetailDrawer,
  Badge,
  Pagination,
  PageHeader,
  SectionCard,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { GameRound, RoundStatus, PaginatedResponse, Bet } from '@/types';

export default function RoundsPage() {
  const [rounds, setRounds] = useState<PaginatedResponse<GameRound> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<GameRound | null>(null);
  const [roundBets, setRoundBets] = useState<Bet[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchRounds = async () => {
      setLoading(true);
      try {
        const response = await apiService.getRoundHistory(currentPage, 20);
        if (response.success && response.data) {
          setRounds(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, [currentPage]);

  const handleRoundClick = async (round: GameRound) => {
    try {
      const betsResponse = await apiService.getRoundBets(round.id);
      if (betsResponse.success && betsResponse.data) {
        setRoundBets(betsResponse.data);
      }
      setSelectedRound(round);
      setDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch round bets:', error);
    }
  };

  const getStatusColor = (status: RoundStatus) => {
    switch (status) {
      case RoundStatus.ACTIVE:
        return 'cyan';
      case RoundStatus.SETTLED:
        return 'success';
      case RoundStatus.CANCELLED:
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Game"
        title="Rounds management"
        description="Monitor automated 60-second rounds and historical profitability."
      />

      <SectionCard title="Round history" description="Chronological record of house engine settlements." noPadding>
        <DataTable
          columns={[
            { key: 'roundNumber', label: 'Round', sortable: true, width: '100px' },
            {
              key: 'status',
              label: 'Status',
              width: '150px',
              render: (value) => <Badge variant={getStatusColor(value as RoundStatus)}>{String(value)}</Badge>,
            },
            {
              key: 'openingResult',
              label: 'Result',
              width: '120px',
              render: (value) => (value && (value as any[]).length > 0 ? (value as number[]).join(', ') : '-'),
            },
            {
              key: 'totalStake',
              label: 'Stake',
              width: '130px',
              render: (value) => `₹${Number(value).toLocaleString()}`,
            },
            {
              key: 'totalPayout',
              label: 'Payout',
              width: '130px',
              render: (value) => `₹${Number(value).toLocaleString()}`,
            },
            {
              key: 'houseProfit',
              label: 'House Profit',
              width: '130px',
              render: (value) => (
                <span className={Number(value) > 0 ? 'text-emerald-400 font-bold' : Number(value) < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {Number(value) > 0 ? '+' : ''}₹{Number(value).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'startedAt',
              label: 'Started',
              width: '180px',
              render: (value) => new Date(value as Date).toLocaleTimeString(),
            },
          ]}
          data={rounds?.items || []}
          loading={loading}
          onRowClick={handleRoundClick}
        />

        {rounds ? (
          <Pagination
            currentPage={rounds.page}
            totalPages={rounds.pages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        ) : null}
      </SectionCard>

      <DetailDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedRound ? `Round #${selectedRound.roundNumber}` : 'Round details'}
        size="lg"
      >
        {selectedRound ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard label="Status" value={<Badge variant={getStatusColor(selectedRound.status)}>{selectedRound.status}</Badge>} />
              <InfoCard label="Result" value={selectedRound.openingResult.length > 0 ? selectedRound.openingResult.join(', ') : '-'} />
              <InfoCard label="Started" value={new Date(selectedRound.startedAt).toLocaleString()} />
              <InfoCard label="Ended" value={selectedRound.endedAt ? new Date(selectedRound.endedAt).toLocaleString() : '-'} />
            </div>

            <DrawerSection title="Financial summary">
              <MetricRow label="Total stake" value={`₹${selectedRound.totalStake.toLocaleString()}`} />
              <MetricRow label="Total payout" value={`₹${selectedRound.totalPayout.toLocaleString()}`} />
              <MetricRow label="House profit" value={`₹${selectedRound.houseProfit.toLocaleString()}`} />
            </DrawerSection>

            <DrawerSection title={`Bets in this round (${roundBets.length})`}>
              <div className="space-y-3">
                {roundBets.slice(0, 10).map((bet) => (
                  <div key={bet.id} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">ID: #{bet.id.slice(-8).toUpperCase()}</p>
                        <p className="text-sm text-slate-400">{bet.betType} · {bet.numbers.join(', ')}</p>
                      </div>
                      <p className="text-sm font-semibold text-white">₹{bet.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
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
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
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

'use client';

import { useEffect, useState } from 'react';
import {
  TabulatorTable,
  DetailDrawer,
  Badge,
  PageHeader,
  SectionCard,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { GameRound, RoundStatus, Bet } from '@/types';

export default function RoundsPage() {
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<GameRound | null>(null);
  const [roundBets, setRoundBets] = useState<Bet[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const fetchRounds = async () => {
      setLoading(true);
      try {
        // Fetch a large batch for local pagination & search
        const response = await apiService.getRoundHistory(1, 200);
        if (response.success && response.data) {
          const items = response.data.items || response.data;
          setRounds(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'cyan';
      case 'SETTLED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns = [
    { key: 'roundNumber', label: 'Round', sortable: true, width: '100' },
    {
      key: 'status',
      label: 'Status',
      width: '150',
      render: (value: any) => <Badge variant={getStatusColor(String(value))}>{String(value)}</Badge>,
    },
    {
      key: 'openingResult',
      label: 'Result',
      width: '120',
      render: (value: any) => (value && Array.isArray(value) && value.length > 0 ? value.join(', ') : '-'),
    },
    {
      key: 'totalStake',
      label: 'Stake',
      width: '130',
      sortable: true,
      render: (value: any) => `₹${Number(value).toLocaleString()}`,
    },
    {
      key: 'totalPayout',
      label: 'Payout',
      width: '130',
      sortable: true,
      render: (value: any) => `₹${Number(value).toLocaleString()}`,
    },
    {
      key: 'houseProfit',
      label: 'House Profit',
      width: '150',
      sortable: true,
      render: (value: any) => (
        <span className={Number(value) > 0 ? 'text-emerald-400 font-bold' : Number(value) < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
          {Number(value) > 0 ? '+' : ''}₹{Number(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'startedAt',
      label: 'Started',
      width: '180',
      sortable: true,
      render: (value: any) => new Date(value as string).toLocaleTimeString(),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Game"
        title="Rounds management"
        description="Monitor automated 60-second rounds and historical profitability."
      />

      <SectionCard title="Round history" description="Chronological record of house engine settlements.">
        <TabulatorTable
          columns={columns}
          data={rounds}
          loading={loading}
          onRowClick={handleRoundClick}
          paginationSize={20}
          title="Round_History"
        />
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

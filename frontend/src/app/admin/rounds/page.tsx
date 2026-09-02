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

  const columns: any[] = [
    { key: 'roundNumber', label: 'Round', sortable: true },
    {
      key: 'status',
      label: 'Status',
      hozAlign: 'center',
      render: (value: any) => <Badge variant={getStatusColor(String(value))}>{String(value)}</Badge>,
    },
    {
      key: 'openingType',
      label: 'Type',
      hozAlign: 'center',
      render: (value: any) => (
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold uppercase">
          {value || 'QUAD'}
        </span>
      ),
    },
    {
      key: 'openingResult',
      label: 'Result',
      hozAlign: 'center',
      render: (value: any) => (value && Array.isArray(value) && value.length > 0 ? (
        <div className="flex items-center justify-center gap-1">
          {value.map((v, i) => (
            <span key={i} className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black text-xs">
              {v}
            </span>
          ))}
        </div>
      ) : '-'),
    },
    {
      key: 'totalStake',
      label: 'Stake',
      hozAlign: 'right',
      sortable: true,
      render: (value: any) => `₹${Number(value).toLocaleString()}`,
    },
    {
      key: 'totalPayout',
      label: 'Payout',
      hozAlign: 'right',
      sortable: true,
      render: (value: any) => `₹${Number(value).toLocaleString()}`,
    },
    {
      key: 'houseProfit',
      label: 'House Profit',
      hozAlign: 'right',
      sortable: true,
      render: (value: any) => (
        <span className={Number(value) > 0 ? 'text-emerald-500 font-black' : Number(value) < 0 ? 'text-rose-500 font-black' : 'text-slate-400 font-bold'}>
          {Number(value) > 0 ? '+' : ''}₹{Number(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'startedAt',
      label: 'Timing',
      sortable: true,
      render: (value: any, row: any) => {
        const start = new Date(value as string);
        const end = row.endedAt ? new Date(row.endedAt) : null;
        return (
          <div className="flex flex-col text-[10px] text-slate-500 font-mono">
            <span>S: {start.toLocaleTimeString()}</span>
            <span>E: {end ? end.toLocaleTimeString() : '-'}</span>
          </div>
        );
      },
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

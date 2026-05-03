'use client';

import { useEffect, useState } from 'react';
import { StatCard, Badge, ProgressBar, PageHeader, SectionCard, DataTable } from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { BetStats, GameRound, RoundStatus } from '@/types';

export default function MonitoringPage() {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [statsRes, roundsRes] = await Promise.all([
        apiService.getCurrentHouseStats(),
        apiService.getRoundHistory(1, 10),
      ]);
      
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (roundsRes.success && roundsRes.data) setRounds(roundsRes.data.items);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Realtime"
        title="Operations monitor"
        description="Live view of platform profitability and round-by-round performance."
        actions={<Badge variant="cyan" className="animate-pulse">Live Link Active</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard title="Total Stake" value={loading ? '...' : `₹${stats?.totalStake.toLocaleString()}`} icon="₹" loading={loading} />
        <StatCard title="Total Bets" value={loading ? '...' : stats?.totalBets || 0} icon="B" loading={loading} />
        <StatCard title="Unique Users" value={loading ? '...' : stats?.uniqueUsers || 0} icon="U" loading={loading} />
      </div>

      <div className="mt-6">
        <SectionCard title="Recent Round History" description="Chronological overview of automated settlements.">
          <DataTable
            columns={[
              { key: 'roundNumber', label: 'Round ID', width: '100px' },
              {
                key: 'status',
                label: 'Status',
                width: '120px',
                render: (value) => (
                  <Badge variant={value === 'SETTLED' ? 'success' : 'warning'}>{String(value)}</Badge>
                ),
              },
              {
                key: 'totalStake',
                label: 'Total Stake',
                render: (v) => `₹${Number(v).toLocaleString()}`
              },
              {
                key: 'totalPayout',
                label: 'Total Payout',
                render: (v) => `₹${Number(v).toLocaleString()}`
              },
              {
                key: 'houseProfit',
                label: 'House Win/Loss',
                render: (v) => (
                  <span className={Number(v) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {Number(v) >= 0 ? '+' : ''}₹{Number(v).toLocaleString()}
                  </span>
                )
              },
              {
                key: 'startedAt',
                label: 'Started At',
                render: (v) => new Date(v as string).toLocaleTimeString()
              }
            ]}
            data={rounds}
            loading={loading}
          />
        </SectionCard>
      </div>
    </>
  );
}

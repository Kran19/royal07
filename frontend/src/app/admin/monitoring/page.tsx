'use client';

import { useEffect, useState } from 'react';
import { StatCard, Badge, PageHeader, SectionCard, TabulatorTable } from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { BetStats, GameRound } from '@/types';
import { cn } from "../../../lib/utils";

export default function MonitoringPage() {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, roundsRes] = await Promise.all([
        apiService.getCurrentHouseStats(),
        apiService.getRoundHistory(1, 100),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (roundsRes.success && roundsRes.data) {
        // Backend returns { items, meta: { pages, ... } }
        const items = roundsRes.data.items || roundsRes.data;
        setRounds(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const columns = [
    { key: 'roundNumber', label: 'Round', width: '100', sortable: true },
    {
      key: 'status',
      label: 'Status',
      width: '120',
      hozAlign: 'center' as const,
      render: (value: any) => (
        <Badge variant={value === 'SETTLED' ? 'success' : 'warning'}>{String(value)}</Badge>
      ),
    },
    {
      key: 'totalStake',
      label: 'Total Stake',
      hozAlign: 'right' as const,
      sortable: true,
      render: (v: any) => `₹${Number(v).toLocaleString()}`
    },
    {
      key: 'totalPayout',
      label: 'Total Payout',
      hozAlign: 'right' as const,
      sortable: true,
      render: (v: any) => `₹${Number(v).toLocaleString()}`
    },
    {
      key: 'houseProfit',
      label: 'House P/L',
      hozAlign: 'right' as const,
      sortable: true,
      render: (v: any) => (
        <span className={Number(v) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
          {Number(v) >= 0 ? '+' : ''}₹{Number(v).toLocaleString()}
        </span>
      )
    },
    {
      key: 'openingResult',
      label: 'Result',
      width: '100',
      hozAlign: 'center' as const,
      render: (v: any) => v !== null && (Array.isArray(v) ? v.length > 0 : true) ? (
        <span className={cn('font-black', 'text-indigo-500', 'dark:text-indigo-400', 'bg-indigo-500/10', 'px-2', 'py-0.5', 'rounded', 'text-[13px]')}>
          {Array.isArray(v) ? v.join(', ') : v}
        </span>
      ) : '-'
    },
    {
      key: 'openingType',
      label: 'Type',
      width: '100',
      hozAlign: 'center' as const,
      render: (v: any) => v ? (
        <span className={cn('text-[11px]', 'font-bold', 'uppercase', 'tracking-wider', 'text-slate-500')}>{v}</span>
      ) : '-'
    },
    {
      key: '_count',
      label: 'Bets',
      width: '80',
      hozAlign: 'center' as const,
      render: (v: any) => v?.bets || 0
    },
    {
      key: 'startedAt',
      label: 'Started At',
      width: '120',
      render: (v: any) => new Date(v as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Realtime"
        title="Operations monitor"
        description="Live view of platform profitability and round-by-round performance."
        // actions={<Badge variant="cyan" className="animate-pulse">Live Link Active</Badge>}
      />

      <div className={cn('grid', 'grid-cols-1', 'gap-6', 'lg:grid-cols-3')}>
        <StatCard title="Total Stake" value={loading ? '...' : `₹${stats?.totalStake.toLocaleString()}`} icon="₹" loading={loading} />
        <StatCard title="Total Bets" value={loading ? '...' : stats?.totalBets || 0} icon="B" loading={loading} />
        <StatCard title="Unique Users" value={loading ? '...' : stats?.uniqueUsers || 0} icon="U" loading={loading} />
      </div>

      <div className="mt-6">
        <SectionCard title="Recent Round History" description="Chronological overview of automated settlements with full pagination.">
          <TabulatorTable
            columns={columns}
            data={rounds}
            loading={loading}
            paginationSize={10}
            title="Round_History"
          />
        </SectionCard>
      </div>
    </>
  );
}

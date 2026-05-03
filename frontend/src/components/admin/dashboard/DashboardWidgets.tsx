'use client';

import React, { useEffect, useState } from 'react';
import { Badge, StatCard } from '@/components/admin/common';
import { Bet, BetStatus, GameRound, BetType } from '@/types';

interface KPIWidgetProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalBetsToday: number;
    totalStakeToday: number;
    totalPayoutToday: number;
    profitLossToday: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  loading?: boolean;
}

export function KPIWidget({ stats, loading }: KPIWidgetProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value).replace('INR', '₹');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Active Users" value={loading ? '...' : stats.activeUsers?.toLocaleString()} icon="A" loading={loading} />
      <StatCard title="Bets (60s)" value={loading ? '...' : stats.totalBetsToday?.toLocaleString()} icon="B" loading={loading} />
      <StatCard title="Current Stake" value={loading ? '...' : formatCurrency(stats.totalStakeToday || 0)} icon="₹" loading={loading} />
      <StatCard
        title="House Profit"
        value={loading ? '...' : formatCurrency(stats.profitLossToday || 0)}
        icon={stats.profitLossToday >= 0 ? '📈' : '📉'}
        loading={loading}
      />
    </div>
  );
}

interface CurrentRoundWidgetProps {
  round?: GameRound;
  loading?: boolean;
  liveStake?: number;
}

export function CurrentRoundWidget({ round, loading, liveStake }: CurrentRoundWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!round?.startedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(round.startedAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, 60 - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [round?.startedAt]);

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-8 h-full">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-700/70" />
      </div>
    );
  }

  if (!round) {
    return (
      <div className="glass-panel flex items-center justify-center rounded-3xl p-6 sm:p-8 text-center text-slate-400 h-full underline decoration-cyan-500/30">
        Initializing House Engine...
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/5 bg-slate-900/20 backdrop-blur-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90">
            Active Round
          </p>
          <h3 className="mt-1 text-2xl font-black text-white italic">
            #{round.roundNumber}
          </h3>
        </div>
        <Badge variant="cyan" size="md">
          Live
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RoundMetric label="Pool" value={`₹${((liveStake && liveStake > 0) ? liveStake : (round.totalStake || 0)).toLocaleString()}`} />
        <RoundMetric label="Time" value={`${timeLeft}s`} highlight={timeLeft < 10} />
        <RoundMetric label="Doors" value="4 (Auto)" />
        <RoundMetric label="Status" value="Accepting" />
      </div>
    </div>
  );
}

function RoundMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${highlight ? 'text-rose-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

interface RecentBetsWidgetProps {
  bets: Bet[];
  loading?: boolean;
}

export function RecentBetsWidget({ bets, loading }: RecentBetsWidgetProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8">
      <h3 className="mb-6 text-lg font-bold text-white">Live Bet Feed</h3>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-700/70" />
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm italic">Engine is cold. Awaiting first bets...</div>
      ) : (
        <div className="space-y-3">
          {bets.slice(0, 5).map((bet) => (
            <div
              key={bet.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-tight">{bet.betType} Bet</p>
                <p className="text-[11px] text-slate-500 font-medium">#{bet.id.slice(-8)} · {bet.numbers.join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-cyan-400">₹{(bet.amount || 0).toLocaleString()}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${bet.status === BetStatus.ACTIVE ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                  <span className="text-[10px] uppercase font-bold text-slate-500">{bet.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

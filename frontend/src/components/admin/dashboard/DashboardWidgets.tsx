'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/admin/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Activity, IndianRupee, TrendingUp, TrendingDown, Clock, Layers, Power } from 'lucide-react';
import { Bet, BetStatus, GameRound, BetType } from '@/types';

import { formatCurrency } from '@/lib/utils/currency';
import { cn } from "../../../lib/utils";

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
    totalOperators: number;
  };
  loading?: boolean;
  currency?: string;
}

function ReferenceStatCard({ title, subtitle, value, bgColor, textColor, isCurrency, loading, currency = 'INR' }: any) {
  return (
    <div className={`relative flex flex-col justify-between p-6 h-[200px] rounded-[24px] ${bgColor} transition-transform hover:-translate-y-1`}>
      <div>
        <h3 className={cn('text-lg', 'font-bold', 'text-slate-900', 'dark:text-white')}>{title}</h3>
        <p className={cn('text-sm', 'font-medium', 'text-slate-600', 'dark:text-slate-400', 'mt-1')}>{subtitle}</p>
      </div>
      <div className={cn('flex', 'items-end', 'justify-between')}>
        {loading ? (
          <div className={cn('h-10', 'w-24', 'animate-pulse', 'rounded-lg', 'bg-black/10', 'dark:bg-white/10')} />
        ) : (
          <h2 className={cn('text-4xl', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-tight')}>
            {isCurrency ? formatCurrency(value || 0, currency, true) : (value || 0).toLocaleString()}
          </h2>
        )}
        <div className={cn('flex', 'h-10', 'w-10', 'shrink-0', 'items-center', 'justify-center', 'rounded-full', 'bg-slate-900', 'text-white', 'dark:bg-white', 'dark:text-slate-900', 'shadow-lg', 'cursor-pointer', 'hover:scale-105', 'transition-transform')}>
          <svg className={cn('w-5', 'h-5')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function KPIWidget({ stats, loading, currency = 'INR' }: KPIWidgetProps) {
  return (
    <div className={cn('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6', 'w-full')}>
      <ReferenceStatCard
        title="Total Bets"
        subtitle="Today's total interaction"
        value={stats.totalBetsToday}
        bgColor="bg-[#fef3c7] dark:bg-amber-500/10"
        loading={loading}
        currency={currency}
      />
      <ReferenceStatCard
        title="Integrated Platforms"
        subtitle="Total operators"
        value={stats.totalOperators || 0}
        bgColor="bg-[#e0e7ff] dark:bg-indigo-500/10"
        loading={loading}
        currency={currency}
      />
      <ReferenceStatCard
        title="House Profit"
        subtitle="Today's net earnings"
        value={stats.profitLossToday}
        bgColor="bg-[#dcfce7] dark:bg-emerald-500/10"
        isCurrency={true}
        loading={loading}
        currency={currency}
      />
      <ReferenceStatCard
        title="Total Wagered"
        subtitle="Today's total stake"
        value={stats.totalStakeToday}
        bgColor="bg-[#fee2e2] dark:bg-rose-500/10"
        isCurrency={true}
        loading={loading}
        currency={currency}
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
      <Card className={cn('h-full', 'flex', 'flex-col')}>
        <CardContent className={cn('pt-6', 'flex-1')}>
          <div className={cn('h-full', 'w-full', 'min-h-[160px]', 'animate-pulse', 'rounded-xl', 'bg-slate-200', 'dark:bg-slate-800/50')} />
        </CardContent>
      </Card>
    );
  }

  if (!round) {
    return (
      <Card className={cn('flex', 'items-center', 'justify-center', 'h-full', 'min-h-[220px]', 'border-dashed', 'border-slate-300', 'dark:border-white/20', 'bg-transparent')}>
        <CardContent className={cn('pt-6', 'flex', 'flex-col', 'items-center', 'justify-center', 'text-slate-500')}>
          <Power className={cn('w-10', 'h-10', 'mb-4', 'opacity-50', 'text-indigo-500', 'dark:text-indigo-400')} />
          <p className={cn('font-medium', 'tracking-wide')}>Initializing House Engine...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', 'min-h-[200px]', 'bg-gradient-to-br', 'from-[#1e1b4b]', 'to-[#312e81]', 'border-none', 'shadow-[0_10px_40px_rgba(49,46,129,0.3)]', 'dark:from-indigo-950', 'dark:to-slate-950', 'overflow-hidden', 'relative', 'rounded-[24px]')}>
      <div className={cn('absolute', '-right-20', '-top-20', 'h-40', 'w-40', 'rounded-full', 'bg-white/10', 'blur-[50px]')}></div>
      <CardHeader className={cn('flex', 'flex-row', 'items-start', 'justify-between', 'space-y-0', 'pb-2', 'relative', 'z-10')}>
        <div>
          <Badge variant="default" className={cn('bg-white/10', 'hover:bg-white/20', 'text-white', 'border-white/20', 'animate-pulse', 'mb-2')}>
            PRO MODE
          </Badge>
          <h3 className={cn('text-2xl', 'font-black', 'text-white', 'leading-tight', 'mt-1')}>
            Live Round<br />#{round.roundNumber}
          </h3>
        </div>
      </CardHeader>
      <CardContent className={cn('relative', 'z-10', 'pb-6')}>
        <div className={cn('grid', 'grid-cols-2', 'gap-3', 'mt-4')}>
          <div className={cn('rounded-xl', 'bg-white/10', 'p-3', 'backdrop-blur-md', 'border', 'border-white/10')}>
            <p className={cn('text-[10px]', 'uppercase', 'font-bold', 'text-indigo-200')}>Current Pool</p>
            <p className={cn('text-lg', 'font-black', 'text-white', 'mt-1')}>₹{((liveStake && liveStake > 0) ? liveStake : (round.totalStake || 0)).toLocaleString()}</p>
          </div>
          <div className={cn('rounded-xl', 'bg-white/10', 'p-3', 'backdrop-blur-md', 'border', 'border-white/10')}>
            <p className={cn('text-[10px]', 'uppercase', 'font-bold', 'text-indigo-200')}>Time Left</p>
            <p className={`text-lg font-black mt-1 ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoundMetric({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl', 'border', 'border-slate-200', 'bg-white/60', 'dark:border-white/10', 'dark:bg-black/20', 'p-4', 'transition-all', 'hover:bg-white/90', 'dark:hover:bg-black/40', 'flex', 'flex-col', 'justify-between', 'backdrop-blur-md')}>
      <div className={cn('flex', 'items-center', 'gap-2', 'mb-3')}>
        <div className={cn('text-indigo-500', 'dark:text-indigo-400', 'opacity-80')}>
          {icon}
        </div>
        <p className={cn('text-[10px]', 'font-bold', 'uppercase', 'tracking-widest', 'text-slate-500', 'dark:text-slate-400')}>
          {label}
        </p>
      </div>
      <p className={`text-xl font-black tracking-tight ${highlight ? 'text-rose-500 dark:text-rose-400 animate-pulse drop-shadow-md dark:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}

interface RecentBetsWidgetProps {
  bets: Bet[];
  loading?: boolean;
}

export function RecentBetsWidget({ bets, loading }: RecentBetsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Bet Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className={cn('h-16', 'animate-pulse', 'rounded-xl', 'bg-slate-200', 'dark:bg-slate-800')} />
            ))}
          </div>
        ) : bets.length === 0 ? (
          <div className={cn('py-12', 'text-center', 'text-slate-500', 'text-sm', 'italic')}>Engine is cold. Awaiting first bets...</div>
        ) : (
          <div className="space-y-3">
            {bets.slice(0, 5).map((bet) => (
              <div
                key={bet.id}
                className={cn('flex', 'items-center', 'justify-between', 'rounded-xl', 'border', 'border-slate-200', 'bg-slate-50', 'dark:border-slate-800', 'dark:bg-slate-900/50', 'p-4', 'transition-all', 'hover:border-slate-300', 'hover:bg-slate-100', 'dark:hover:border-slate-700', 'dark:hover:bg-slate-800')}
              >
                <div>
                  <p className={cn('text-sm', 'font-bold', 'text-slate-900', 'dark:text-slate-200', 'uppercase', 'tracking-tight')}>{bet.betType} Bet</p>
                  <p className={cn('text-[11px]', 'text-slate-500', 'font-medium')}>#{bet.id.slice(-8)} · {bet.numbers.join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm', 'font-black', 'text-indigo-600', 'dark:text-indigo-400')}>₹{(bet.amount || 0).toLocaleString()}</p>
                  <div className={cn('flex', 'items-center', 'justify-end', 'gap-1.5', 'mt-1')}>
                    <span className={`h-1.5 w-1.5 rounded-full ${bet.status === BetStatus.ACTIVE ? 'bg-indigo-500 shadow-sm dark:bg-indigo-400 dark:shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-400 dark:bg-slate-600'}`} />
                    <span className={cn('text-[10px]', 'uppercase', 'font-bold', 'text-slate-500')}>{bet.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

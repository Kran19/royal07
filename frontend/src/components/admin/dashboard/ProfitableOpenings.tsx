'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { QuadProfitResult, BetStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function ProfitableOpenings() {
  const [openings, setOpenings] = useState<QuadProfitResult[]>([]);
  const [stats, setStats] = useState<Partial<BetStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Admin Socket Connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('openings_update', (data: { results: QuadProfitResult[]; timestamp: string; totalStake: number; totalProfitable: number; calculationTimeMs: number }) => {
      setOpenings(data.results);
      setStats({
        totalStake: data.totalStake,
        totalBets: data.totalProfitable, // Re-using this or could adds more fields
        calculationTimeMs: data.calculationTimeMs
      });
      setLastUpdate(new Date(data.timestamp));
      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount).replace('INR', '₹');
  };

  if (loading && !isConnected) {
    return (
      <Card className={cn('h-full', 'flex', 'flex-col', 'min-h-[320px]', 'shadow-sm', 'border-slate-200/60', 'dark:border-slate-800')}>
        <CardContent className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'h-full', 'p-8', 'text-center')}>
          <div className={cn('h-16', 'w-16', 'bg-indigo-50', 'dark:bg-indigo-500/10', 'rounded-full', 'flex', 'items-center', 'justify-center', 'mb-4')}>
            <Loader2 className={cn('h-8', 'w-8', 'animate-spin', 'text-indigo-500')} />
          </div>
          <h3 className={cn('text-lg', 'font-bold', 'text-slate-900', 'dark:text-white', 'mb-2')}>Connecting to Engine...</h3>
          <p className={cn('text-sm', 'text-slate-500', 'max-w-[280px]')}>Establishing secure WebSocket connection to the live House Engine.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col min-h-[320px] shadow-sm border-slate-200/60 dark:border-slate-800">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Profitable Openings
              <span className={cn("ml-1 h-2 w-2 rounded-full", isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500')} />
            </CardTitle>
            <CardDescription className="mt-1.5">
              Real-time profitability analysis across 495 combinations
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <StatMini label="Pool" value={formatCurrency(stats?.totalStake || 0)} />
            <StatMini label="Profitable" value={`${openings.filter(o => o.profitable).length}`} />
            <StatMini label="Latency" value={`${stats?.calculationTimeMs || 0}ms`} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center pb-6 px-4 sm:px-6">
        {openings.length === 0 && isConnected ? (
          <div className="flex flex-col items-center justify-center text-center h-[160px]">
            <div className="h-12 w-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-bold">Waiting for active round data...</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px]">Live profitability calculations will appear here once bets are placed.</p>
          </div>
        ) : (
          <div className={cn('p-4', 'sm:p-6', 'grid', 'grid-cols-1', 'gap-4', 'sm:grid-cols-2', 'xl:grid-cols-3')}>
            {openings.slice(0, 6).map((opening) => (
              <div 
                key={opening.rank} 
                className={cn(
                  "group relative overflow-hidden rounded-[16px] border p-4 transition-all hover:-translate-y-1 hover:shadow-lg",
                  opening.profitable 
                    ? 'border-emerald-200/60 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20' 
                    : 'border-rose-200/60 bg-rose-50/50 hover:border-rose-300 dark:border-rose-900/30 dark:bg-rose-950/20 dark:hover:bg-rose-900/20'
                )}
              >
                <div className={cn('flex', 'items-center', 'justify-between', 'mb-3')}>
                  <span className={cn('text-[10px]', 'font-black', 'uppercase', 'tracking-widest', 'text-slate-500')}>Rank #{opening.rank}</span>
                  {opening.profitable ? (
                    <span className={cn('text-[10px]', 'font-black', 'text-emerald-600', 'dark:text-emerald-400', 'uppercase', 'bg-emerald-100', 'dark:bg-emerald-900/40', 'px-2', 'py-0.5', 'rounded-md')}>Profitable</span>
                  ) : (
                    <span className={cn('text-[10px]', 'font-black', 'text-rose-600', 'dark:text-rose-400', 'uppercase', 'bg-rose-100', 'dark:bg-rose-900/40', 'px-2', 'py-0.5', 'rounded-md')}>Loss Risk</span>
                  )}
                </div>
                
                <div className={cn('mb-3', 'text-sm', 'font-black', 'text-slate-900', 'dark:text-slate-100', 'tracking-wider')}>
                  {opening.opening.join(' · ')}
                </div>
                
                <div className={cn("text-xl font-black mb-3", opening.profitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {formatCurrency(opening.profit)}
                </div>
                
                <div className={cn('grid', 'grid-cols-2', 'gap-2', 'border-t', 'border-slate-200/60', 'dark:border-slate-700/50', 'pt-3')}>
                  <div className={cn('flex', 'flex-col')}>
                    <span className={cn('text-[9px]', 'font-bold', 'text-slate-400', 'uppercase')}>Margin</span>
                    <span className={cn('text-xs', 'font-semibold', 'text-slate-700', 'dark:text-slate-300')}>{opening.margin}%</span>
                  </div>
                  <div className={cn('flex', 'flex-col')}>
                    <span className={cn('text-[9px]', 'font-bold', 'text-slate-400', 'uppercase')}>ROI</span>
                    <span className={cn('text-xs', 'font-semibold', 'text-slate-700', 'dark:text-slate-300')}>{(opening.roi * 100).toFixed(1)}%</span>
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

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-r border-slate-200 dark:border-slate-700 pr-4 last:border-0 last:pr-0">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{value}</span>
    </div>
  );
}

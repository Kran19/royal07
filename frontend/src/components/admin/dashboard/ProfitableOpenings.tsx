'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { QuadProfitResult, BetStats } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

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
      <div className="glass-panel flex h-64 flex-col items-center justify-center rounded-3xl p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
        <p className="mt-4 text-slate-400 font-medium">Connecting to live House Engine...</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            🎯 Profitable Openings
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
          </h2>
          <p className="mt-1 text-sm text-slate-400">Real-time profitability analysis for all 495 combinations</p>
        </div>
        
        <div className="flex flex-wrap gap-4 rounded-2xl bg-white/5 p-4 border border-white/10">
          <StatMini label="Total Pool" value={formatCurrency(stats?.totalStake || 0)} />
          <StatMini label="Profitable" value={`${openings.filter(o => o.profitable).length} / 495`} />
          <StatMini label="Latency" value={`${stats?.calculationTimeMs || 0}ms`} />
          <StatMini label="Updated" value={lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {openings.map((opening) => (
          <div 
            key={opening.rank} 
            className={`group relative overflow-hidden rounded-2xl border transition-all hover:scale-[1.02] ${
              opening.profitable 
                ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' 
                : 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10'
            } p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rank #{opening.rank}</span>
              {opening.profitable ? (
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Profitable</span>
              ) : (
                <span className="text-[10px] font-bold text-rose-400 uppercase">Loss Risk</span>
              )}
            </div>
            
            <div className="mb-4 text-lg font-bold text-white tracking-widest">
              {opening.opening.join(' · ')}
            </div>
            
            <div className={`text-2xl font-black ${opening.profitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(opening.profit)}
            </div>
            
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Margin: {opening.margin}%</span>
              <span>ROI: {(opening.roi * 100).toFixed(1)}%</span>
            </div>
            
            <div className="mt-4 flex flex-col gap-1 border-t border-white/5 pt-3 text-[10px] text-slate-500">
              <div className="flex justify-between">
                <span>Singles Payout:</span>
                <span>{formatCurrency(opening.singlesPayout)}</span>
              </div>
              <div className="flex justify-between">
                <span>Quad Payout:</span>
                <span>{formatCurrency(opening.quadPayout)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center text-xs text-slate-500 italic">
        🔄 House Engine automatically selects Rank #1 results for every round settlement.
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-r border-white/10 pr-4 last:border-0 last:pr-0">
      <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

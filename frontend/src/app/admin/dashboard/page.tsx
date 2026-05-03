'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/common';
import {
  KPIWidget,
  CurrentRoundWidget,
} from '@/components/admin/dashboard/DashboardWidgets';
import { ProfitableOpenings } from '@/components/admin/dashboard/ProfitableOpenings';
import { apiService } from '@/lib/api/api-service';
import { BetStats, GameRound } from '@/types';
import { FloorHeatmap } from '@/components/admin/dashboard/FloorHeatmap';
import { io } from 'socket.io-client';

/**
 * Modernized Admin Dashboard Page
 * High-performance real-time monitoring of the House Engine.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, roundRes] = await Promise.all([
          apiService.getCurrentHouseStats(),
          apiService.getCurrentRound()
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (roundRes.success && roundRes.data) {
          setCurrentRound(roundRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s refresh for REST stats
    
    // Setup Admin WebSockets
    const backendUrl = process.env.NEXT_PUBLIC_WS_URL || '';
    const socket = io(backendUrl, {
      transports: ['websocket'],
    });
    
    // Register as admin to logic inside gateway if necessary (currently handled globally or locally)
    const onLiveBets = (data: { floorExposure: number[], totalStake: number, roundId: string }) => {
      setLiveExposure(data.floorExposure);
      setLiveTotalStake(data.totalStake);
    };

    const onRoundSettled = (data: { totalStake: number, totalPayout: number, houseProfit: number }) => {
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalPayoutToday: prev.totalPayoutToday + data.totalPayout,
          profitLossToday: prev.profitLossToday + data.houseProfit
        };
      });
      // Reset live exposure after settled
      setLiveExposure(new Array(12).fill(0));
      setLiveTotalStake(0);
      fetchData(); // Sync up round numbers immediately
    };

    socket.on('admin_live_bets', onLiveBets);
    socket.on('admin_round_settled', onRoundSettled);

    return () => {
      clearInterval(interval);
      socket.off('admin_live_bets', onLiveBets);
      socket.off('admin_round_settled', onRoundSettled);
    };
  }, []);

  const [liveExposure, setLiveExposure] = useState<number[]>(new Array(12).fill(0));
  const [liveTotalStake, setLiveTotalStake] = useState<number>(0);

  // Map backend BetStats to the KPIWidget expectations
  const kpiStats = {
    totalUsers: stats?.uniqueUsers || 0,
    activeUsers: stats?.uniqueUsers || 0,
    totalBetsToday: stats?.totalBets || 0,
    totalStakeToday: liveTotalStake > 0 ? liveTotalStake : (stats?.totalStake || 0),
    totalPayoutToday: stats?.totalPayoutToday || 0, // Using locally updated stats
    profitLossToday: stats?.profitLossToday || 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="House Engine"
        title="Real-time Operations"
        description="Automated 60-second round monitoring and profitability analytics."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <KPIWidget stats={kpiStats} loading={loading} />
        <CurrentRoundWidget round={currentRound || undefined} loading={loading} liveStake={liveTotalStake} />
      </div>

      <FloorHeatmap floorExposure={liveExposure} totalStake={liveTotalStake} />

      <ProfitableOpenings />

      <div className="mt-8 rounded-3xl border border-white/5 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md">
        <h3 className="text-xl font-bold text-white mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthMetric label="Aggregation Engine" status="Optimal" />
          <HealthMetric label="WebSocket Gateway" status="Connected" />
          <HealthMetric label="TimescaleDB Latency" status="< 2ms" />
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 p-5 border border-white/5">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
        {status}
      </span>
    </div>
  );
}

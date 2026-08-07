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
import { cn } from "../../../lib/utils";

/**
 * Modernized Admin Dashboard Page
 * High-performance real-time monitoring of the House Engine.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [roundStake, setRoundStake] = useState<number>(0);
  const [roundProfit, setRoundProfit] = useState<number>(0);

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
          const round = roundRes.data;
          setCurrentRound(round);
          
          setCurrentRoundId(prevId => {
            if (round.status === 'ACTIVE') {
              if (round.id !== prevId) {
                setRoundStake(0);
                setRoundProfit(0);
                return round.id;
              }
            } else {
              setRoundStake(round.totalStake);
              setRoundProfit(round.houseProfit);
            }
            return round.id; // Always keep the active round ID in state
          });
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
    const backendUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const socket = io(backendUrl, {
      transports: ['websocket'],
    });
    
    // Register as admin to logic inside gateway if necessary (currently handled globally or locally)
    const onLiveBets = (data: { floorExposure: number[], totalStake: number, roundId: string }) => {
      setLiveExposure(data.floorExposure);
      setLiveTotalStake(data.totalStake);
      setRoundStake(data.totalStake);
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
      // Update round stats
      setRoundStake(data.totalStake);
      setRoundProfit(data.houseProfit);

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
  }, [currentRoundId]);

  const [liveExposure, setLiveExposure] = useState<number[]>(new Array(12).fill(0));
  const [liveTotalStake, setLiveTotalStake] = useState<number>(0);

  // Map backend BetStats to the KPIWidget expectations
  const kpiStats = {
    totalUsers: stats?.uniqueUsers || 0,
    activeUsers: stats?.uniqueUsers || 0,
    totalBetsToday: stats?.totalBets || 0,
    totalStakeToday: roundStake,
    totalPayoutToday: stats?.totalPayoutToday || 0, // Using locally updated stats
    profitLossToday: roundProfit,
    totalDeposits: 0,
    totalWithdrawals: 0,
  };

  return (
    <div className={cn('space-y-8', 'pb-12')}>
      <div>
        <h1 className={cn('text-[32px]', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-normal')}>
          Hello Admin
        </h1>
        <p className={cn('text-sm', 'font-medium', 'text-slate-500', 'dark:text-slate-400', 'mt-1')}>
          Monitor performance and operations in real time.
        </p>
      </div>

      <div className={cn('grid', 'grid-cols-1', 'gap-6', 'lg:grid-cols-4')}>
        <KPIWidget stats={kpiStats} loading={loading} />
        <div className="col-span-1">
          <CurrentRoundWidget round={currentRound || undefined} loading={loading} liveStake={liveTotalStake} />
        </div>
      </div>

      <div className={cn('grid', 'grid-cols-1', 'gap-6', 'lg:grid-cols-2')}>
        <FloorHeatmap floorExposure={liveExposure} totalStake={liveTotalStake} />
        <ProfitableOpenings />
      </div>

      {/* <div className="mt-8 rounded-[24px] bg-white dark:bg-slate-900/40 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-xl transition-colors">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthMetric label="Aggregation Engine" status="Optimal" />
          <HealthMetric label="WebSocket Gateway" status="Connected" />
          <HealthMetric label="TimescaleDB Latency" status="< 2ms" />
        </div>
      </div> */}
    </div>
  );
}

function HealthMetric({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] bg-[#f4f7fe] dark:bg-slate-800/50 p-5">
      <span className="text-slate-600 dark:text-slate-400 font-bold">{label}</span>
      <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-widest text-xs bg-emerald-100 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full">
        {status}
      </span>
    </div>
  );
}

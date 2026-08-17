'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Server, TrendingUp, TrendingDown, Users } from 'lucide-react';

export function OperatorProfitWidget() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const res = await apiService.getOperatorProfitSummary();
        if (res.success && res.data) {
          setSummaries(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch operator profit summary', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
    const interval = setInterval(fetchSummaries, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && summaries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading operator performance...</p>
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return null; // Don't show the widget if there are no operators
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Platform P&L
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Profit generated per integrated platform</p>
        </div>
      </div>

      <div className="space-y-4">
        {summaries.map((op, index) => {
          const isProfitable = op.profit >= 0;
          return (
            <div 
              key={op.id} 
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-950 flex items-center justify-center text-sm font-black text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{op.name}</p>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {op.userCount} users
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>Wagered: ₹{op.totalStake.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className={cn(
                  "text-lg font-black flex items-center justify-end gap-1.5",
                  isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  ₹{Math.abs(op.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Payout: ₹{op.totalPayout.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

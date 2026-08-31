'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface OperatorGGR {
  id: string;
  operatorId: string;
  name: string;
  totalBets: number;
  totalVolume: number;
  totalPayouts: number;
  netGGR: number;
}

export function GGRLeaderboardWidget({ currency = 'INR' }: { currency?: string }) {
  const [data, setData] = useState<OperatorGGR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGGR = async () => {
      try {
        const res = await apiService.get(`/operator/analytics/ggr?currency=${currency}`);
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch GGR', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGGR();
    const interval = setInterval(fetchGGR, 15000);
    return () => clearInterval(interval);
  }, [currency]);

  if (loading) return <Card className="p-6 h-64 flex items-center justify-center animate-pulse"><Trophy className="w-8 h-8 text-slate-300" /></Card>;

  return (
    <Card className="p-6 flex flex-col h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          GGR Leaderboard
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Rank</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right rounded-r-lg">Net GGR</th>
            </tr>
          </thead>
          <tbody>
            {data.map((op, i) => (
              <tr key={op.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-500">#{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{op.name}</div>
                  <div className="text-xs text-slate-400">{op.totalBets} bets</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                  {formatCurrency(op.totalVolume, currency)}
                </td>
                <td className={cn(
                  "px-4 py-3 text-right font-mono font-bold",
                  op.netGGR >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {formatCurrency(op.netGGR, currency, true)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-500">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

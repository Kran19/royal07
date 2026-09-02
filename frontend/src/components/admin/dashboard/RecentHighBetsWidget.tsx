'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Flame, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function RecentHighBetsWidget() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const res = await apiService.getRecentHighBets(5, 500); // Top 5 bets >= 500
        if (res.success && res.data) {
          setBets(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch high bets', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
    const interval = setInterval(fetchBets, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && bets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse h-full flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">Monitoring high-roller activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Live High Rollers
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent stakes over ₹500</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {bets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 min-h-[200px]">
            <Flame className="w-10 h-10 mb-2 opacity-20" />
            <p className="font-medium text-sm">No recent high stakes detected</p>
          </div>
        ) : (
          bets.map((bet) => (
            <div 
              key={bet.id} 
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-orange-500/20 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {bet.user?.username || bet.user?.mobile || bet.userId.slice(-6)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wider px-2 py-0 h-5 border-slate-200 dark:border-slate-700">
                      RND #{bet.round?.roundNumber || bet.roundId.slice(-4)}
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  ₹{bet.amount.toLocaleString()}
                </p>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                  bet.status === 'WON' ? 'text-emerald-500' : 
                  bet.status === 'LOST' ? 'text-rose-500' : 'text-amber-500'
                )}>
                  {bet.status} {bet.status === 'WON' && `(+₹${(bet.payout || 0).toLocaleString()})`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

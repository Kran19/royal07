'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { Card } from '@/components/ui/card';
import { WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface Settlement {
  id: string;
  operatorId: string;
  name: string;
  netGGR: number;
  settlementOwed: number;
}

export function SettlementWidget({ currency = 'INR' }: { currency?: string }) {
  const [data, setData] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await apiService.get(`/operator/analytics/settlement?currency=${currency}`);
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch settlement data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettlement();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSettlement, 30000);
    return () => clearInterval(interval);
  }, [currency]);

  if (loading) return <Card className="p-6 h-64 flex items-center justify-center animate-pulse"><WalletCards className="w-8 h-8 text-slate-300" /></Card>;

  return (
    <Card className="p-6 flex flex-col h-full bg-indigo-600 border-none shadow-md overflow-hidden relative">
      {/* Decorative background circle */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <WalletCards className="w-5 h-5 text-indigo-200" />
          Operator GGR Settlement
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-indigo-500 text-white rounded-md">This Month</span>
      </div>
      
      <div className="space-y-4 overflow-y-auto pr-2 relative z-10">
        {data.map((op) => (
          <div key={op.id} className="bg-indigo-700/50 p-4 rounded-xl border border-indigo-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{op.name}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-indigo-300 mb-0.5">Net GGR</p>
                <p className="text-xl font-black text-white tracking-tight">{formatCurrency(op.netGGR, currency, true)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-300 mb-0.5">Owed to RoyalBet</p>
                <p className={cn("font-mono font-bold text-lg", op.settlementOwed >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {formatCurrency(op.settlementOwed, currency)}
                </p>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center py-8 text-indigo-300">No settlement data.</div>
        )}
      </div>
    </Card>
  );
}

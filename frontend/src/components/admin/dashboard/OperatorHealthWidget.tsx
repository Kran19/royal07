'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperatorHealth {
  id: string;
  operatorId: string;
  name: string;
  successRate: number;
  pendingRetries: number;
  failedCount: number;
  avgResponseTimeMs: number;
}

export function OperatorHealthWidget() {
  const [healthData, setHealthData] = useState<OperatorHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiService.get('/operator/analytics/health');
        if (res.success && res.data) {
          setHealthData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch operator health', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Card className="p-6 h-64 flex items-center justify-center animate-pulse"><Activity className="w-8 h-8 text-slate-300" /></Card>;

  return (
    <Card className="p-6 flex flex-col h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Operator API Health
        </h3>
      </div>
      
      <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
        {healthData.map(op => {
          const isHealthy = op.successRate > 95 && op.pendingRetries < 5;
          const isWarning = op.successRate <= 95 || op.pendingRetries >= 5;
          const isCritical = op.successRate < 80 || op.pendingRetries >= 20;
          
          let statusColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
          let StatusIcon = CheckCircle2;
          
          if (isCritical) {
            statusColor = "text-rose-500 bg-rose-50 dark:bg-rose-500/10";
            StatusIcon = AlertTriangle;
          } else if (isWarning) {
            statusColor = "text-amber-500 bg-amber-50 dark:bg-amber-500/10";
            StatusIcon = AlertTriangle;
          }

          return (
            <div key={op.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{op.name} <span className="text-xs text-slate-400 font-mono">({op.operatorId})</span></span>
                <Badge variant="outline" className={cn("border-0 flex items-center gap-1", statusColor)}>
                  <StatusIcon className="w-3 h-3" />
                  {isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Success Rate</span>
                  <span className={cn("font-medium", op.successRate < 90 ? "text-rose-500" : "text-slate-700 dark:text-slate-300")}>
                    {op.successRate}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Avg Latency</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {op.avgResponseTimeMs}ms
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Pending Retries</span>
                  <span className={cn("font-medium", op.pendingRetries > 0 ? "text-amber-500" : "text-slate-700 dark:text-slate-300")}>
                    {op.pendingRetries} stuck
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {healthData.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">No operators found.</div>
        )}
      </div>
    </Card>
  );
}

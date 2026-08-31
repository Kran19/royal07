'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { Card } from '@/components/ui/card';
import { Bell, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemAlert {
  id: string;
  type: string;
  message: string;
  source: string;
  operatorId?: string;
  isRead: boolean;
  createdAt: string;
}

export function SystemAlertsFeed() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await apiService.get('/operator/analytics/alerts');
        if (res.success && res.data) {
          setAlerts(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch alerts', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          System Alerts Feed
        </h3>
        {alerts.length > 0 && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </div>
      
      <div className="overflow-y-auto max-h-96 divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">All systems nominal. No alerts.</div>
        ) : (
          alerts.map(alert => {
            let Icon = Info;
            let iconColor = "text-blue-500";
            
            if (alert.type === 'CRITICAL') {
              Icon = ShieldAlert;
              iconColor = "text-rose-500";
            } else if (alert.type === 'WARNING') {
              Icon = AlertCircle;
              iconColor = "text-amber-500";
            }

            return (
              <div key={alert.id} className={cn("p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors", !alert.isRead && "bg-slate-50/50 dark:bg-slate-800/30")}>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                        {alert.source}
                      </span>
                      <span className="text-[10px] text-slate-400">&bull;</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

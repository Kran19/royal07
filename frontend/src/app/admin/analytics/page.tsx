'use client';

import { useEffect, useState } from 'react';
import { StatCard, Button, ProgressBar, PageHeader, SectionCard, Badge } from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { BetStats } from '@/types';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<BetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiService.getCurrentHouseStats();
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₹${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Risk and analytics"
        description="Real-time exposure analysis and platform risk profiling for the house engine."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Stake" value={loading ? '...' : formatCurrency(stats?.totalStake || 0)} icon="₹" loading={loading} />
        <StatCard title="Total Bets" value={loading ? '...' : stats?.totalBets || 0} icon="B" loading={loading} />
        <StatCard title="Active Users" value={loading ? '...' : stats?.uniqueUsers || 0} icon="U" loading={loading} />
      </div>

      <SectionCard title="Current opening exposure" description="Distribution of potential payouts according to the House Engine.">
        <div className="space-y-4 pt-4">
          {Object.entries(stats?.quads || {}).slice(0, 10).map(([quad, value]) => (
            <ProgressBar 
              key={quad} 
              label={`Quad [${quad}]`} 
              value={Number(value)} 
              max={stats?.totalStake || 1}
              variant={Number(value) > (stats?.totalStake || 0) * 0.5 ? 'danger' : 'default'}
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

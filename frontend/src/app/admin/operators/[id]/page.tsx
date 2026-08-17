'use client';

import React, { useEffect, useState, use } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Activity, Server, Users, DollarSign, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OperatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [operator, setOperator] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    callbackUrl: '',
    status: 'ACTIVE'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [opRes, statsRes] = await Promise.all([
          apiService.getOperators(),
          apiService.getOperatorStats(id)
        ]);

        if (opRes.success && opRes.data) {
          const found = opRes.data.find((o: any) => o.id === id);
          if (found) {
            setOperator(found);
            setFormData({
              name: found.name,
              callbackUrl: found.callbackUrl,
              status: found.status
            });
          }
        }
        
        if (statsRes.success) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiService.updateOperator(id, formData);
      if (res.success) {
        alert('Settings saved successfully');
        setOperator(res.data);
      } else {
        alert('Failed to save settings: ' + res.error);
      }
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading operator details...</div>;
  }

  if (!operator) {
    return <div className="p-12 text-center text-red-500">Operator not found</div>;
  }

  const successRate = stats 
    ? (stats.successCallbacks / Math.max(stats.successCallbacks + stats.failedCallbacks, 1)) * 100 
    : 0;

  return (
    <div className={cn('space-y-8', 'pb-12')}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/admin/operators')}
              className="text-slate-400 hover:text-indigo-600 transition-colors"
            >
              ← Back
            </button>
            <h1 className={cn('text-[32px]', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-normal')}>
              {operator.name}
            </h1>
            <span className={cn(
              "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
              operator.status === 'ACTIVE' 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
            )}>
              {operator.status}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 font-mono">
            ID: {operator.operatorId}
          </p>
        </div>
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            "pb-4 px-2 text-sm font-bold border-b-2 transition-colors",
            activeTab === 'stats' 
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "pb-4 px-2 text-sm font-bold border-b-2 transition-colors",
            activeTab === 'settings' 
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Settings
        </button>
      </div>

      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500">Federated Users</p>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500">Total Wagered (Debit)</p>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{stats.totalWagered.toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500">Total Payout (Credit)</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{stats.totalCredited.toLocaleString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500">Callback Health</p>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  successRate > 95 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {stats.failedCallbacks} failed out of {stats.successCallbacks + stats.failedCallbacks}
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Recent Connectivity</h3>
            {stats.failedCallbacks > 0 ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">Failed Callbacks Detected</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    This operator has {stats.failedCallbacks} failed transaction callbacks. Go to the Transaction Logs to view and retry them.
                  </p>
                  <button 
                    onClick={() => router.push(`/admin/operators/transactions?op=${operator.id}`)}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    View Failed Transactions
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">All Systems Nominal</h4>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
                    Wallet callbacks to this operator are succeeding normally.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Operator Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Callback URL</label>
              <input 
                type="url" 
                value={formData.callbackUrl}
                onChange={e => setFormData({ ...formData, callbackUrl: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="submit" 
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

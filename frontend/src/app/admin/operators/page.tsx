'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Plus, Server, Activity, ShieldCheck, MoreVertical, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { CreateOperatorModal } from '@/components/admin/operators/CreateOperatorModal';

export default function OperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await apiService.getOperators();
      if (res.success && res.data) {
        setOperators(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch operators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={cn('space-y-8', 'pb-12')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-[32px]', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-normal')}>
            B2B Operators
          </h1>
          <p className={cn('text-sm', 'font-medium', 'text-slate-500', 'dark:text-slate-400', 'mt-1')}>
            Manage external platforms that integrate with RoyalBet.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>Register Operator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Operators</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{operators.length}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Integrations</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{operators.filter(o => o.status === 'ACTIVE').length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Security</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">RSA-256 Enabled</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registered Platforms</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6 whitespace-nowrap">Operator Name</th>
                <th className="py-4 px-6 whitespace-nowrap">Operator ID</th>
                <th className="py-4 px-6 whitespace-nowrap">Callback URL</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Users</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Txns</th>
                <th className="py-4 px-6 whitespace-nowrap">Status</th>
                <th className="py-4 px-6 whitespace-nowrap">Registered</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <p className="text-sm font-medium">Loading operators...</p>
                    </div>
                  </td>
                </tr>
              ) : operators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Server className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-400 mt-2">No operators found</p>
                      <p className="text-sm">Click "Register Operator" to add a new B2B partner.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                operators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 dark:text-white">{op.name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded">
                          {op.operatorId}
                        </code>
                        <button 
                          onClick={() => handleCopy(op.operatorId, op.id)}
                          className="text-slate-400 hover:text-indigo-500 transition-colors"
                          title="Copy ID"
                        >
                          {copiedId === op.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-[200px] truncate text-sm text-slate-600 dark:text-slate-400">
                      {op.callbackUrl}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {op._count?.users?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {op._count?.transactions?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
                        op.status === 'ACTIVE' 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      )}>
                        {op.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {new Date(op.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link 
                        href={`/admin/operators/${op.id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 text-xs font-bold transition-colors"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOperatorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchOperators} 
      />
    </div>
  );
}

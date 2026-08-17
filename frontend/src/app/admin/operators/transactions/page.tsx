'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Activity, Server, RefreshCw, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

export default function OperatorTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filters
  const [operators, setOperators] = useState<any[]>([]);
  const [filterOp, setFilterOp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = async (currentPage = page) => {
    setLoading(true);
    try {
      const res = await apiService.getOperatorTransactions({
        page: currentPage,
        limit: 50,
        operatorId: filterOp || undefined,
        status: filterStatus || undefined,
        type: filterType || undefined
      });
      if (res.success && res.data) {
        setTransactions(res.data.items);
        setTotalPages(res.data.meta.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load operators for filter
    apiService.getOperators().then(res => {
      if (res.success && res.data) setOperators(res.data);
    });
  }, []);

  useEffect(() => {
    fetchTransactions(1);
    setPage(1);
  }, [filterOp, filterStatus, filterType]);

  const handleRetry = async (txnId: string) => {
    setRetryingId(txnId);
    try {
      const res = await apiService.retryTransaction(txnId);
      if (res.success) {
        // Refresh log
        fetchTransactions();
      } else {
        alert(`Retry failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className={cn('space-y-8', 'pb-12')}>
      <div>
        <h1 className={cn('text-[32px]', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-normal')}>
          Callback Logs
        </h1>
        <p className={cn('text-sm', 'font-medium', 'text-slate-500', 'dark:text-slate-400', 'mt-1')}>
          Monitor and retry automated wallet callbacks to operator platforms.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none"
              value={filterOp}
              onChange={e => setFilterOp(e.target.value)}
            >
              <option value="">All Operators</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <select 
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="DEBIT">Debit (Bet)</option>
              <option value="CREDIT">Credit (Win)</option>
              <option value="ROLLBACK">Rollback</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <select 
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <button 
            onClick={() => fetchTransactions(page)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-4 px-4 whitespace-nowrap">Timestamp</th>
                <th className="py-4 px-4 whitespace-nowrap">Operator</th>
                <th className="py-4 px-4 whitespace-nowrap">User ID</th>
                <th className="py-4 px-4 whitespace-nowrap">Type</th>
                <th className="py-4 px-4 whitespace-nowrap">Amount</th>
                <th className="py-4 px-4 whitespace-nowrap">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading logs...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {txn.operator?.name || txn.operatorId}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {txn.userId}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold",
                        txn.type === 'CREDIT' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                        txn.type === 'DEBIT' ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      ₹{Number(txn.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {txn.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {txn.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                        {txn.status === 'PENDING' && <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />}
                        <span className={cn(
                          "text-xs font-bold",
                          txn.status === 'SUCCESS' ? "text-emerald-600" :
                          txn.status === 'FAILED' ? "text-red-600" : "text-yellow-600"
                        )}>
                          {txn.status}
                          {txn.retries > 0 && <span className="text-slate-400 ml-1">({txn.retries} retries)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {txn.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(txn.id)}
                          disabled={retryingId === txn.id}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1 ml-auto"
                        >
                          {retryingId === txn.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchTransactions(page - 1); }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-medium text-sm"
              >
                Previous
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => { setPage(p => p + 1); fetchTransactions(page + 1); }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50 font-medium text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

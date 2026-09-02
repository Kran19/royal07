'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api/api-service';
import { cn } from '@/lib/utils';
import { Activity, Server, RefreshCw, CheckCircle2, XCircle, Search, Filter, Eye } from 'lucide-react';

export default function OperatorTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

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

  const handleSkip = async (txnId: string) => {
    if (!confirm('Are you sure you want to mark this transaction as SKIPPED? This bypasses the operator callback.')) return;
    try {
      const res = await apiService.skipTransaction(txnId);
      if (res.success) {
        fetchTransactions();
      } else {
        alert(`Skip failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Skip error: ${err.message}`);
    }
  };

  return (
    <div className={cn('space-y-8', 'pb-12')}>
      <div>
        <h1 className={cn('text-[32px]', 'font-black', 'text-slate-900', 'dark:text-white', 'tracking-normal')}>
          Callback Logs
        </h1>
        <p className={cn('text-sm', 'font-medium', 'text-slate-500', 'dark:text-slate-400', 'mt-1')}>
          Monitor, retry, or skip automated wallet callbacks to operator platforms.
        </p>
      </div>

      <div className={cn('bg-white', 'dark:bg-slate-900', 'rounded-[24px]', 'p-6', 'shadow-sm', 'border', 'border-slate-100', 'dark:border-slate-800')}>
        <div className={cn('flex', 'flex-wrap', 'items-center', 'gap-4', 'mb-6')}>
          <div className={cn('flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'bg-slate-50', 'dark:bg-slate-800', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700')}>
            <Filter className={cn('w-4', 'h-4', 'text-slate-400')} />
            <select 
              className={cn('bg-transparent', 'text-sm', 'font-semibold', 'text-slate-700', 'dark:text-slate-300', 'outline-none')}
              value={filterOp}
              onChange={e => setFilterOp(e.target.value)}
            >
              <option value="">All Operators</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>

          <div className={cn('flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'bg-slate-50', 'dark:bg-slate-800', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700')}>
            <select 
              className={cn('bg-transparent', 'text-sm', 'font-semibold', 'text-slate-700', 'dark:text-slate-300', 'outline-none')}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="DEBIT">Debit (Bet)</option>
              <option value="CREDIT">Credit (Win)</option>
              <option value="ROLLBACK">Rollback</option>
            </select>
          </div>

          <div className={cn('flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'bg-slate-50', 'dark:bg-slate-800', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700')}>
            <select 
              className={cn('bg-transparent', 'text-sm', 'font-semibold', 'text-slate-700', 'dark:text-slate-300', 'outline-none')}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>

          <button 
            onClick={() => fetchTransactions(page)}
            className={cn('p-2.5', 'rounded-xl', 'bg-slate-100', 'dark:bg-slate-800', 'hover:bg-slate-200', 'dark:hover:bg-slate-700', 'transition-colors', 'text-slate-600', 'dark:text-slate-400')}
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className={cn('w-full', 'text-left', 'border-collapse')}>
            <thead>
              <tr className={cn('border-b', 'border-slate-100', 'dark:border-slate-800', 'text-sm', 'font-semibold', 'text-slate-500', 'dark:text-slate-400')}>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>Timestamp</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>Operator</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>User ID</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>Txn ID</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>Round ID</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap')}>Type</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap', 'text-right')}>Amount</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap', 'text-center')}>Retries</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap', 'text-center')}>Latency</th>
                <th className={cn('py-4', 'px-4', 'whitespace-nowrap', 'text-center')}>Status</th>
                <th className={cn('py-4', 'px-4', 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn('divide-y', 'divide-slate-100', 'dark:divide-slate-800', 'text-sm')}>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className={cn('py-12', 'text-center', 'text-slate-500')}>
                    Loading logs...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className={cn('py-12', 'text-center', 'text-slate-500')}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className={cn('hover:bg-slate-50/50', 'dark:hover:bg-slate-800/30')}>
                    <td className={cn('py-3', 'px-4', 'font-mono', 'text-xs', 'text-slate-500')}>
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td className={cn('py-3', 'px-4', 'font-semibold', 'text-slate-700', 'dark:text-slate-300')}>
                      {txn.operator?.name || txn.operatorId}
                    </td>
                    <td className={cn('py-3', 'px-4')}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {txn.displayUsername}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {txn.internalUserId}
                        </span>
                      </div>
                    </td>
                    <td className={cn('py-3', 'px-4', 'font-mono', 'text-[10px]', 'text-slate-400')}>
                      {txn.transactionId}
                    </td>
                    <td className={cn('py-3', 'px-4', 'font-mono', 'text-[10px]', 'text-slate-400')}>
                      {txn.roundId}
                    </td>
                    <td className={cn('py-3', 'px-4')}>
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        txn.type === 'CREDIT' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                        txn.type === 'DEBIT' ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {txn.type}
                      </span>
                    </td>
                    <td className={cn('py-3', 'px-4', 'font-bold', 'text-slate-900', 'dark:text-white', 'text-right')}>
                      ₹{Number(txn.amount).toLocaleString()}
                    </td>
                    <td className={cn('py-3', 'px-4', 'text-center')}>
                      <span className={cn(
                        "font-mono text-xs font-semibold px-2 py-1 rounded",
                        txn.retries > 0 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "text-slate-500"
                      )}>
                        {txn.retries}
                      </span>
                    </td>
                    <td className={cn('py-3', 'px-4', 'text-center', 'font-mono', 'text-xs', 'text-slate-500')}>
                      {txn.responseTimeMs != null ? `${txn.responseTimeMs}ms` : '-'}
                    </td>
                    <td className={cn('py-3', 'px-4')}>
                      <div className={cn('flex', 'items-center', 'gap-1.5')}>
                        {txn.status === 'SUCCESS' && <CheckCircle2 className={cn('w-4', 'h-4', 'text-emerald-500')} />}
                        {txn.status === 'FAILED' && <XCircle className={cn('w-4', 'h-4', 'text-red-500')} />}
                        {txn.status === 'PENDING' && <RefreshCw className={cn('w-4', 'h-4', 'text-yellow-500', 'animate-spin')} />}
                        {txn.status === 'SKIPPED' && <XCircle className={cn('w-4', 'h-4', 'text-slate-400')} />}
                        <span className={cn(
                          "text-xs font-bold",
                          txn.status === 'SUCCESS' ? "text-emerald-600" :
                          txn.status === 'FAILED' ? "text-red-600" : 
                          txn.status === 'SKIPPED' ? "text-slate-500" : "text-yellow-600"
                        )}>
                          {txn.status}
                          {txn.retries > 0 && txn.status !== 'SKIPPED' && txn.status !== 'SUCCESS' && <span className={cn('text-slate-400', 'ml-1')}>({txn.retries} retries)</span>}
                        </span>
                      </div>
                    </td>
                    <td className={cn('py-3', 'px-4', 'text-right')}>
                      <div className="flex items-center justify-end gap-2">
                        {txn.status === 'FAILED' && (
                          <>
                            <button
                              onClick={() => handleRetry(txn.id)}
                              disabled={retryingId === txn.id}
                              title="Retry Transaction"
                              className={cn('p-2', 'rounded-lg', 'bg-indigo-50', 'text-indigo-600', 'hover:bg-indigo-100', 'dark:bg-indigo-500/10', 'dark:text-indigo-400', 'dark:hover:bg-indigo-500/20', 'transition-colors', 'disabled:opacity-50', 'flex', 'items-center', 'justify-center')}
                            >
                              <RefreshCw className={cn('w-4', 'h-4', retryingId === txn.id && 'animate-spin')} />
                            </button>
                            <button
                              onClick={() => handleSkip(txn.id)}
                              title="Skip Transaction"
                              className={cn('p-2', 'rounded-lg', 'bg-slate-100', 'text-slate-600', 'hover:bg-slate-200', 'dark:bg-slate-800', 'dark:text-slate-400', 'dark:hover:bg-slate-700', 'transition-colors', 'flex', 'items-center', 'justify-center')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          title="View Details"
                          className={cn('p-2', 'rounded-lg', 'bg-slate-100', 'text-slate-700', 'hover:bg-slate-200', 'dark:bg-slate-800', 'dark:text-slate-300', 'dark:hover:bg-slate-700', 'transition-colors')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={cn('flex', 'items-center', 'justify-between', 'pt-6', 'mt-6', 'border-t', 'border-slate-100', 'dark:border-slate-800')}>
            <p className={cn('text-sm', 'text-slate-500')}>Page {page} of {totalPages}</p>
            <div className={cn('flex', 'gap-2')}>
              <button 
                disabled={page === 1}
                onClick={() => { setPage(p => p - 1); fetchTransactions(page - 1); }}
                className={cn('px-4', 'py-2', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700', 'disabled:opacity-50', 'font-medium', 'text-sm')}
              >
                Previous
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => { setPage(p => p + 1); fetchTransactions(page + 1); }}
                className={cn('px-4', 'py-2', 'rounded-xl', 'border', 'border-slate-200', 'dark:border-slate-700', 'disabled:opacity-50', 'font-medium', 'text-sm')}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Response Details Modal */}
      {selectedTxn && (
        <div 
          className={cn('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4', 'bg-slate-900/80', 'backdrop-blur-sm')}
          onClick={() => setSelectedTxn(null)}
        >
          <div 
            className={cn('w-full', 'max-w-2xl', 'bg-white', 'dark:bg-slate-900', 'rounded-2xl', 'shadow-xl', 'overflow-hidden', 'flex', 'flex-col', 'max-h-[85vh]', 'border', 'border-slate-100', 'dark:border-slate-800')}
            onClick={e => e.stopPropagation()}
          >
            <div className={cn('flex', 'items-center', 'justify-between', 'p-4', 'md:p-6', 'border-b', 'border-slate-100', 'dark:border-slate-800', 'bg-slate-50', 'dark:bg-slate-800/50')}>
              <h3 className={cn('text-lg', 'font-bold', 'text-slate-900', 'dark:text-white', 'flex', 'items-center', 'gap-2')}>
                <Search className={cn('w-5', 'h-5', 'text-indigo-500')} />
                Transaction Response Log
              </h3>
              <button 
                onClick={() => setSelectedTxn(null)}
                className={cn('w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'rounded-full', 'bg-slate-200', 'dark:bg-slate-800', 'text-slate-500', 'hover:text-slate-900', 'dark:hover:text-white', 'transition-colors')}
              >
                ✕
              </button>
            </div>
            <div className={cn('p-4', 'md:p-6', 'overflow-y-auto', 'space-y-4')}>
              <div className={cn('grid', 'grid-cols-2', 'gap-4', 'text-sm')}>
                <div>
                  <p className={cn('text-slate-500', 'font-semibold', 'mb-1')}>Transaction ID</p>
                  <code className={cn('px-2', 'py-1', 'bg-slate-100', 'dark:bg-slate-800', 'rounded', 'font-mono', 'text-xs')}>{selectedTxn.transactionId}</code>
                </div>
                <div>
                  <p className={cn('text-slate-500', 'font-semibold', 'mb-1')}>Status</p>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-bold",
                    selectedTxn.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" :
                    selectedTxn.status === 'FAILED' ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {selectedTxn.status}
                  </span>
                </div>
              </div>
              <div>
                <p className={cn('text-slate-500', 'font-semibold', 'mb-2', 'text-sm')}>Raw Response Payload</p>
                {selectedTxn.responsePayload ? (
                  <pre className={cn('p-4', 'rounded-xl', 'bg-slate-950', 'text-emerald-400', 'font-mono', 'text-xs', 'overflow-x-auto', 'whitespace-pre-wrap', 'border', 'border-slate-800')}>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedTxn.responsePayload), null, 2);
                      } catch {
                        return selectedTxn.responsePayload;
                      }
                    })()}
                  </pre>
                ) : (
                  <div className={cn('p-8', 'text-center', 'bg-slate-50', 'dark:bg-slate-800/50', 'rounded-xl', 'border', 'border-dashed', 'border-slate-200', 'dark:border-slate-700')}>
                    <p className={cn('text-slate-500', 'text-sm', 'italic')}>No response payload stored for this transaction.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

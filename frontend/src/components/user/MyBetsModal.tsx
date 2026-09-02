'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { useAuth } from '@/context/AuthContext';

interface MyBetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function MyBetsModal({ isOpen, onClose, token }: MyBetsModalProps) {
  const { user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bets/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.data.items || []);
      }
    } catch (e) {
      console.error('History load failed', e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-yellow-400 flex items-center justify-center bg-white/5 p-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          My Bets
        </h3>
        {isDesktop && (
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-medium">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-20 text-center text-slate-500 italic">No bets found. Start playing to see your history!</div>
        ) : (
            <div className="flex flex-col gap-2 p-2">
            {history.map((bet: any, idx: number) => {
              const isWin = bet.settlementAmount > 0;
              const isSettled = bet.round.status === 'SETTLED';
              const dateStr = bet.createdAt ? new Date(bet.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              const timeStr = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
              
              const modeLabel = bet.betType === 'SINGLE' ? 'SIMPLE' : bet.betType === 'PAIR' ? 'COMBINED' : bet.betType;

              return (
                <div key={bet.id} className="flex flex-col bg-[#141926] rounded-xl border border-white/5 p-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide">Round {bet.round.roundNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{dateStr} {timeStr}</span>
                    </div>
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', bet.betType === 'SINGLE' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400')}>
                      {modeLabel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-bold text-slate-300">Stake</div>
                      <div className="text-sm text-white font-mono font-bold">{formatCurrency(bet.amount, user?.currency || 'INR', true)}</div>
                    </div>
                    
                    <div className="flex flex-col gap-1 items-end">
                      <div className="text-xs text-slate-400">Payout</div>
                      {bet.status === 'SETTLED' ? (
                        Number(bet.settlementAmount) > 0 ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <div className="text-sm font-mono font-bold">
                              +{formatCurrency(bet.settlementAmount, user?.currency || 'INR', true)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-rose-400">
                            <div className="text-sm text-slate-500 font-mono font-bold">-{formatCurrency(bet.amount, user?.currency || 'INR', true)}</div>
                          </div>
                        )
                      ) : bet.status === 'CANCELLED' ? (
                        <div className="text-sm text-slate-400 font-mono font-bold">Refunded</div>
                      ) : (
                        <div className="text-sm text-yellow-400 font-mono font-bold animate-pulse">Pending...</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between bg-black/20 rounded-lg p-2 mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Your Numbers</span>
                      <div className="flex flex-wrap gap-1">
                        {bet.numbers?.map((n: number) => (
                          <span key={n} className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 text-white text-[10px] font-bold">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isSettled && bet.round.openingResult && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Result</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {bet.round.openingResult?.map((n: number) => {
                            const isMatched = bet.numbers?.includes(n);
                            return (
                              <span key={n} className={cn("w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold", isMatched ? "bg-[#5cb83d] text-black" : "bg-white/5 text-slate-400")}>
                                {n}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
            </div>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1423] border border-white/5 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  // Mobile full screen
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] overflow-hidden">
      {content}
      <button 
        onClick={onClose}
        className="m-4 rounded-2xl bg-white/10 p-4 font-bold text-white mb-20"
      >
        Close
      </button>
    </div>
  );
}

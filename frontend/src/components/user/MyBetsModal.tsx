'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface MyBetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function MyBetsModal({ isOpen, onClose, token }: MyBetsModalProps) {
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
          <div className="w-full">
            <div className="grid grid-cols-3 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500 border-b border-white/5 bg-[#0b0e14]">
              <div>Date / Round</div>
              <div className="text-center">Bet & Mode</div>
              <div className="text-right">Win (₹)</div>
            </div>
            {history.map((bet: any, idx: number) => {
              const isWin = bet.settlementAmount > 0;
              const isSettled = bet.round.status === 'SETTLED';
              const isEven = idx % 2 === 0;
              const dateStr = bet.createdAt ? new Date(bet.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : `Rnd ${bet.round.roundNumber}`;
              const timeStr = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
              
              const modeLabel = bet.betType === 'SINGLE' ? 'SIMP' : bet.betType === 'PAIR' ? 'COMB' : bet.betType.substring(0, 4);
              const pillLabel = (isWin && bet.amount > 0) ? `${(bet.settlementAmount / bet.amount).toFixed(2)}x` : modeLabel;

              return (
                <div key={bet.id} className={cn('grid grid-cols-3 items-center px-4 py-3 text-sm border-b border-white/[0.02]', isEven ? 'bg-[#111623]' : 'bg-[#0c101a]')}>
                  <div className="text-slate-400 text-xs font-mono">
                    {dateStr} {timeStr && `· ${timeStr}`}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white font-mono">{Number(bet.amount).toFixed(2)}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm', isWin ? 'bg-[#5cb83d] text-black' : 'bg-white/10 text-slate-300')}>
                      {pillLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {isSettled ? (
                      isWin ? (
                        <>
                          <span className="text-[#5cb83d] font-mono font-bold">{Number(bet.settlementAmount).toFixed(2)}</span>
                          <div className="w-4 h-4 bg-[#5cb83d] rounded-[3px] flex items-center justify-center">
                            <svg className="w-3 h-3 text-[#0a0f18]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500 font-mono">-</span>
                      )
                    ) : (
                      <span className="text-slate-400 font-mono">...</span>
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

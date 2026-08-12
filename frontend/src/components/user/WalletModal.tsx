'use client';

import React from 'react';
import WalletPanel from './WalletPanel';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  balance: number;
  onBalanceChange: (newBalance: number) => void;
  onLogout?: () => void;
}

export default function WalletModal({ isOpen, onClose, token, balance, onBalanceChange, onLogout }: WalletModalProps) {
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  if (!isOpen) return null;

  if (isDesktop) {
    // Desktop: Modal Centered Dialog
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1423] border border-white/5 p-2 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#eab308] flex items-center justify-center bg-white/5 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </span>
              My Wallet
            </h3>
            <button 
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>
          <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">
            <WalletPanel token={token} balance={balance} onBalanceChange={onBalanceChange} onLogout={onLogout} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Dedicated Full Screen fake-page to preserve React State
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-slate-900">
        <h3 className="text-lg font-black text-white px-2">💳 Wallet</h3>
        <button 
          onClick={onClose}
          className="text-sm font-bold text-slate-400 px-3 py-1 bg-slate-800 rounded-lg hover:text-white active:bg-slate-700"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <WalletPanel token={token} balance={balance} onBalanceChange={onBalanceChange} />
      </div>
    </div>
  );
}

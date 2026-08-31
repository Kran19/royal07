'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from "../../lib/utils";
import { formatCurrency } from '@/lib/utils/currency';
import { useAuth } from '@/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WalletTab = 'balance' | 'deposit' | 'withdraw' | 'history';

type DepositReq = { id: string; amount: number; status: string; proofImageUrl?: string; createdAt: string };
type WithdrawReq = { id: string; amount: number; upiOrAccount: string; status: string; createdAt: string };
type TxRecord = { id: string; type: string; amount: number; status: string; adminRemark?: string; createdAt: string };

type HistoryData = {
  transactions: TxRecord[];
  deposits: DepositReq[];
  withdrawals: WithdrawReq[];
};

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'text-yellow-300 bg-yellow-500/10 ring-yellow-500/20',
    APPROVED: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
    PAID: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
    REJECTED: 'text-rose-300 bg-rose-500/10 ring-rose-500/20',
    COMPLETED: 'text-cyan-300 bg-cyan-500/10 ring-cyan-500/20',
  };
  const cls = colors[status] || 'text-slate-300 bg-white/5 ring-white/10';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cls}`}>{status}</span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface WalletPanelProps {
  token: string;
  balance: number;
  onBalanceChange: (newBalance: number) => void;
  onLogout?: () => void;
}

export default function WalletPanel({ token, balance, onBalanceChange, onLogout }: WalletPanelProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<WalletTab>('balance');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositStep, setDepositStep] = useState<'amount' | 'proof'>('amount');
  const [pendingDepositId, setPendingDepositId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiAccount, setUpiAccount] = useState('');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/wallet/history`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) setHistory(data.data);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const refreshBalance = async () => {
    try {
      const res = await fetch(`${API_BASE}/wallet/balance`, { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.data?.balance !== undefined) onBalanceChange(data.data.balance);
    } catch { /* ignore */ }
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/status`);
      const data = await res.json();
      if (data.success) setPlatformSettings(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ─── Deposit ───────────────────────────────────────────────────────────────

  const handleRequestDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return flash('Enter a valid amount', 'err');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: Number(depositAmount) }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingDepositId(data.data.id);
        setDepositStep('proof');
        flash('Deposit request created! Now upload payment proof.');
      } else {
        flash(data.message || 'Error creating deposit', 'err');
      }
    } catch { flash('Network error', 'err'); }
    setLoading(false);
  };

  const handleUploadProof = async () => {
    if (!proofFile || !pendingDepositId) return flash('Select a proof image first', 'err');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('proof', proofFile);
      const res = await fetch(`${API_BASE}/wallet/deposit/${pendingDepositId}/proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        flash('Proof uploaded! Your deposit is now under review.');
        setDepositStep('amount');
        setDepositAmount('');
        setProofFile(null);
        setPendingDepositId('');
      } else {
        flash('Proof upload failed', 'err');
      }
    } catch { flash('Network error', 'err'); }
    setLoading(false);
  };

  // ─── Withdraw ──────────────────────────────────────────────────────────────

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return flash('Enter a valid amount', 'err');
    if (!upiAccount.trim()) return flash('Enter your UPI ID or Bank Account', 'err');
    if (Number(withdrawAmount) > balance) return flash('Insufficient balance', 'err');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: Number(withdrawAmount), upiOrAccount: upiAccount }),
      });
      const data = await res.json();
      if (data.success) {
        flash('Withdrawal request submitted! Admin will process it shortly.');
        setWithdrawAmount('');
        setUpiAccount('');
      } else {
        flash(data.message || 'Error requesting withdrawal', 'err');
      }
    } catch { flash('Network error', 'err'); }
    setLoading(false);
  };

  // ─── UI ────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'balance' as WalletTab, label: <div className={cn('flex', 'items-center', 'justify-center', 'gap-1.5')}><svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Balance</div> },
    (!user?.operatorId ? { id: 'deposit' as WalletTab, label: <div className={cn('flex', 'items-center', 'justify-center', 'gap-1.5')}><svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> Deposit</div> } : null),
    (!user?.operatorId ? { id: 'withdraw' as WalletTab, label: <div className={cn('flex', 'items-center', 'justify-center', 'gap-1.5')}><svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> Withdraw</div> } : null),
    { id: 'history' as WalletTab, label: <div className={cn('flex', 'items-center', 'justify-center', 'gap-1.5')}><svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> History</div> },
  ].filter(Boolean) as { id: WalletTab; label: React.ReactNode }[];

  return (
    <div className={cn('flex', 'flex-col', 'gap-4')}>
      {/* Tabs & Logout */}
      <div className={cn('flex', 'items-center', 'gap-3')}>
        <div className={cn('flex', 'flex-1', 'gap-1', 'rounded-full', 'bg-[#192033]', 'p-1.5', 'shadow-inner')}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-[#fdcc1c] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
       
      </div>

      {/* Flash Message */}
      {msg && (
        <div className={cn(
          'flex', 'items-center', 'gap-3', 'px-4', 'py-3.5', 'rounded-[1rem]', 'text-sm', 'font-medium', 'shadow-2xl', 'border', 'border-l-4', 'transition-all',
          msg.type === 'ok' 
            ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/[0.02] border-emerald-500/30 border-l-emerald-500 text-emerald-200'
            : 'bg-gradient-to-r from-rose-500/10 to-rose-500/[0.02] border-rose-500/30 border-l-rose-500 text-rose-200'
        )}>
          {msg.type === 'ok' ? (
            <svg className={cn('w-5', 'h-5', 'text-emerald-400', 'shrink-0')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className={cn('w-5', 'h-5', 'text-rose-400', 'shrink-0')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <p className="leading-relaxed">{msg.text}</p>
        </div>
      )}

      {/* Balance Tab */}
      {tab === 'balance' && (
        <div className={cn('rounded-[1.5rem]', 'bg-[#1d1f25]', 'p-10', 'text-center', 'border', 'border-white/5', 'shadow-2xl', 'mt-2')}>
          <p className={cn('text-sm', 'font-bold', 'uppercase', 'tracking-[0.15em]', 'text-[#b8951a]')}>Available Balance</p>
          <p className={cn('mt-3', 'text-[3.25rem]', 'leading-none', 'font-bold', 'text-white', 'tracking-tight', 'font-display')}>{formatCurrency(balance, user?.currency || 'INR', true)}</p>

          <button
            type="button"
            onClick={refreshBalance}
            className={cn('mt-6', 'rounded-full', 'bg-[#2a2c33]', 'px-6', 'py-2.5', 'text-sm', 'font-bold', 'text-slate-300', 'hover:bg-[#343740]', 'transition', 'shadow-inner')}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Deposit Tab */}
      {tab === 'deposit' && (
        <div className={cn('space-y-5', 'mt-2')}>
          {depositStep === 'amount' ? (
            <>
              {/* Removed 'How to deposit' block per user request */}              {platformSettings && (
                <div className={cn('relative', 'rounded-[1.5rem]', 'bg-gradient-to-b', 'from-[#1e2230]', 'to-[#151822]', 'border', 'border-[#2a2e40]', 'shadow-2xl', 'p-6', 'space-y-5', 'overflow-hidden')}>
               
                  <div className={cn('flex', 'items-center', 'justify-between', 'pb-4', 'border-b', 'border-[#2a2e40]')}>
                    <h4 className={cn('text-[0.75rem]', 'font-bold', 'uppercase', 'tracking-[0.15em]', 'text-yellow-500/80')}>Payment Details</h4>
                    <span className={cn('px-2.5', 'py-1', 'rounded-lg', 'bg-emerald-500/10', 'text-emerald-400', 'text-[0.65rem]', 'font-bold', 'uppercase', 'tracking-widest', 'ring-1', 'ring-emerald-500/20')}>Verified Merchant</span>
                  </div>
                  
                  <div className={cn('bg-[#11131a]', 'rounded-[1.25rem]', 'border', 'border-white/[0.03]', 'shadow-inner', 'overflow-hidden')}>
                    {platformSettings.bankAccountName && (
                      <div className={cn('flex', 'justify-between', 'items-center', 'p-3', 'px-4', 'border-b', 'border-white/[0.03]')}>
                        <span className={cn('text-[0.65rem]', 'text-slate-500', 'font-bold', 'uppercase', 'tracking-widest')}>Account Name</span>
                        <div className={cn('flex', 'items-center', 'gap-3')}>
                          <span className={cn('text-[0.85rem]', 'text-white', 'font-semibold')}>{platformSettings.bankAccountName}</span>
                          <button onClick={() => { navigator.clipboard.writeText(platformSettings.bankAccountName); flash('Copied!'); }} className={cn('text-slate-400', 'hover:text-white', 'transition-colors')}>
                            <svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {platformSettings.bankAccountNumber && (
                      <div className={cn('flex', 'justify-between', 'items-center', 'p-3', 'px-4', 'border-b', 'border-white/[0.03]')}>
                        <span className={cn('text-[0.65rem]', 'text-slate-500', 'font-bold', 'uppercase', 'tracking-widest')}>Account Number</span>
                        <div className={cn('flex', 'items-center', 'gap-3')}>
                          <span className={cn('text-[0.95rem]', 'text-white', 'font-mono', 'font-bold')}>{platformSettings.bankAccountNumber}</span>
                          <button onClick={() => { navigator.clipboard.writeText(platformSettings.bankAccountNumber); flash('Copied!'); }} className={cn('text-slate-400', 'hover:text-white', 'transition-colors')}>
                            <svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {platformSettings.bankIfscCode && (
                      <div className={cn('flex', 'justify-between', 'items-center', 'p-3', 'px-4', 'border-b', 'border-white/[0.03]')}>
                        <span className={cn('text-[0.65rem]', 'text-slate-500', 'font-bold', 'uppercase', 'tracking-widest')}>IFSC Code</span>
                        <div className={cn('flex', 'items-center', 'gap-3')}>
                          <span className={cn('text-[0.85rem]', 'text-white', 'font-mono', 'font-semibold')}>{platformSettings.bankIfscCode}</span>
                          <button onClick={() => { navigator.clipboard.writeText(platformSettings.bankIfscCode); flash('Copied!'); }} className={cn('text-slate-400', 'hover:text-white', 'transition-colors')}>
                            <svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {platformSettings.upiId && (
                      <div className={cn('flex', 'justify-between', 'items-center', 'p-3', 'px-4', 'bg-yellow-500/[0.02]')}>
                        <span className={cn('text-[0.65rem]', 'text-yellow-500/70', 'font-bold', 'uppercase', 'tracking-widest')}>UPI ID</span>
                        <div className={cn('flex', 'items-center', 'gap-3')}>
                          <span className={cn('text-[0.95rem]', 'text-yellow-400', 'font-mono', 'font-bold')}>{platformSettings.upiId}</span>
                          <button onClick={() => { navigator.clipboard.writeText(platformSettings.upiId); flash('Copied!'); }} className={cn('text-yellow-500/70', 'hover:text-yellow-400', 'transition-colors')}>
                            <svg className={cn('w-4', 'h-4')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {platformSettings.qrCodeUrl && (
                    <div className={cn('pt-2', 'flex', 'flex-col', 'items-center', 'gap-2')}>
                      <p className={cn('text-[10px]', 'text-slate-500', 'font-bold', 'uppercase')}>Scan to Pay</p>
                      <div className={cn('p-2', 'bg-white', 'rounded-xl', 'shadow-lg', 'shadow-black/20')}>
                        <img 
                          src={`${API_BASE}${platformSettings.qrCodeUrl}`} 
                          alt="Payment QR" 
                          className={cn('h-32', 'w-32', 'object-contain')}
                        />
                      </div>
                    </div>
                  )}

                  {platformSettings.paymentInstructions && (
                    <div className={cn('pt-2', 'border-t', 'border-white/5')}>
                      <p className={cn('text-[10px]', 'text-slate-500', 'font-bold', 'uppercase', 'mb-1')}>Important Note</p>
                      <p className={cn('text-[11px]', 'leading-relaxed', 'text-slate-400', 'italic')}>{platformSettings.paymentInstructions}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className={cn('mb-2', 'block', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-400')}>
                  AMOUNT ({user?.currency || 'INR'})
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className={cn('w-full', 'rounded-2xl', 'bg-[#14161f]', 'border', 'border-white/5', 'py-3.5', 'px-5', 'text-white', 'font-medium', 'outline-none', 'focus:border-yellow-500/50', 'transition-colors', 'shadow-inner', 'placeholder:text-slate-600')}
                />
              </div>
              <div className={cn('flex', 'flex-wrap', 'gap-2.5')}>
                {[100, 200, 500, 1000, 2000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepositAmount(String(v))}
                    className={`rounded-[1rem] px-5 py-2.5 text-sm font-bold transition-all shadow-inner ${
                      depositAmount === String(v)
                        ? 'bg-[#fdcc1c] text-black shadow-md'
                        : 'bg-[#222530] text-slate-300 hover:bg-[#2a2e3b]'
                    }`}
                  >
                    {formatCurrency(v, user?.currency || 'INR', true)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={loading || !depositAmount}
                onClick={handleRequestDeposit}
                className={cn('w-full', 'rounded-[1.25rem]', 'py-4', 'text-sm', 'font-bold', 'transition-all', 'disabled:opacity-40', 'disabled:bg-[#181a20]', 'disabled:text-slate-500', 'bg-gradient-to-r', 'from-[#2c3242]', 'to-[#1e2333]', 'hover:from-[#353c4f]', 'hover:to-[#282f42]', 'text-white', 'border', 'border-white/5', 'shadow-inner', 'mt-2')}
              >
                {loading ? 'Processing...' : 'Proceed to Upload Proof'}
              </button>
            </>
          ) : (
            <>
              <div className={cn('rounded-[1rem]', 'bg-gradient-to-r', 'from-emerald-500/10', 'to-emerald-500/[0.02]', 'p-4', 'text-sm', 'font-medium', 'text-emerald-200', 'border', 'border-emerald-500/20', 'border-l-4', 'border-l-emerald-500', 'flex', 'items-start', 'gap-3', 'shadow-lg')}>
                <svg className={cn('w-5', 'h-5', 'text-emerald-400', 'mt-0.5', 'shrink-0')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="leading-relaxed">Deposit request created for <span className={cn('font-bold', 'text-emerald-400', 'text-[0.95rem]')}>{formatCurrency(Number(depositAmount), user?.currency || 'INR', true)}</span>. Now upload your payment screenshot.</p>
              </div>
              <div>
                <label className={cn('mb-2', 'block', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-400')}>
                  Payment Screenshot
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn('cursor-pointer', 'rounded-[1.25rem]', 'border-2', 'border-dashed', 'border-white/10', 'bg-[#14161f]', 'p-6', 'text-center', 'hover:border-yellow-500/40', 'hover:bg-[#1a1c26]', 'transition-all', 'shadow-inner')}
                >
                  {proofFile ? (
                    <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'space-y-2')}>
                      <div className={cn('w-10', 'h-10', 'rounded-full', 'bg-emerald-500/20', 'flex', 'items-center', 'justify-center')}>
                        <svg className={cn('w-5', 'h-5', 'text-emerald-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className={cn('font-semibold', 'text-emerald-300', 'text-sm', 'truncate', 'max-w-[200px]')}>{proofFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <div className={cn('mx-auto', 'w-12', 'h-12', 'bg-white/5', 'rounded-full', 'flex', 'items-center', 'justify-center', 'mb-3')}>
                        <svg className={cn('w-6', 'h-6', 'text-slate-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p className={cn('text-[0.8rem]', 'font-bold', 'text-slate-300')}>Click to upload screenshot</p>
                      <p className={cn('mt-1', 'text-[0.65rem]', 'text-slate-500')}>PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
              <button
                type="button"
                disabled={loading || !proofFile}
                onClick={handleUploadProof}
                className={cn('w-full', 'rounded-[1.25rem]', 'py-4', 'text-sm', 'font-bold', 'transition-all', 'disabled:opacity-40', 'disabled:bg-[#181a20]', 'disabled:text-slate-500', 'bg-gradient-to-r', 'from-[#2c3242]', 'to-[#1e2333]', 'hover:from-[#353c4f]', 'hover:to-[#282f42]', 'text-white', 'border', 'border-white/5', 'shadow-inner', 'mt-4')}
              >
                {loading ? 'Uploading...' : 'Submit Proof'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Withdraw Tab */}
      {tab === 'withdraw' && (
        <div className={cn('space-y-5', 'mt-2')}>
          <div className={cn('rounded-[1.25rem]', 'bg-gradient-to-br', 'from-[#1e2230]', 'to-[#151822]', 'p-6', 'text-sm', 'border', 'border-[#2a2e40]', 'shadow-xl', 'flex', 'flex-col', 'items-center', 'text-center')}>
            <p className={cn('text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.15em]', 'text-slate-400', 'mb-2')}>Amount Available to Withdraw</p>
            <p className={cn('text-3xl', 'font-bold', 'text-white', 'tracking-tight', 'mb-3')}>{formatCurrency(balance, user?.currency || 'INR', true)}</p>
            <div className={cn('w-12', 'h-1', 'bg-yellow-500/20', 'rounded-full', 'mb-3')} />
            <p className={cn('text-[0.75rem]', 'text-slate-400', 'font-medium', 'leading-relaxed', 'max-w-[80%]')}>Securely transfer your funds directly to your preferred bank account or UPI.</p>
          </div>
          <div>
            <label className={cn('mb-2', 'block', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-400')}>
              AMOUNT ({user?.currency || 'INR'})
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 500"
              className={cn('w-full', 'rounded-2xl', 'bg-[#14161f]', 'border', 'border-white/5', 'py-3.5', 'px-5', 'text-white', 'font-medium', 'outline-none', 'focus:border-yellow-500/50', 'transition-colors', 'shadow-inner', 'placeholder:text-slate-600')}
            />
          </div>
          <div>
            <label className={cn('mb-2', 'block', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-400')}>
              UPI ID OR BANK ACCOUNT
            </label>
            <input
              type="text"
              value={upiAccount}
              onChange={(e) => setUpiAccount(e.target.value)}
              placeholder="e.g. name@upi or 1234567890"
              className={cn('w-full', 'rounded-2xl', 'bg-[#14161f]', 'border', 'border-white/5', 'py-3.5', 'px-5', 'text-white', 'font-medium', 'outline-none', 'focus:border-yellow-500/50', 'transition-colors', 'shadow-inner', 'placeholder:text-slate-600')}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleWithdraw}
            className={cn('w-full', 'rounded-[1.25rem]', 'py-4', 'text-sm', 'font-bold', 'transition-all', 'disabled:opacity-40', 'disabled:bg-[#181a20]', 'disabled:text-slate-500', 'bg-[#fdcc1c]', 'hover:bg-[#ebd573]', 'text-black', 'shadow-md', 'mt-2')}
          >
            {loading ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className={cn('space-y-4', 'max-h-[75vh]', 'md:max-h-[55vh]', 'overflow-y-auto', 'pr-1', 'custom-scrollbar', 'mt-2')}>
          {!history ? (
            <div className={cn('py-10', 'text-center', 'text-slate-500', 'font-medium')}>Loading history...</div>
          ) : (
            <>
              {history.deposits.length > 0 && (
                <div>
                  <p className={cn('mb-2', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-500')}>Deposit Requests</p>
                  {history.deposits.map((d) => (
                    <div key={d.id} className={cn('mb-2', 'flex', 'items-center', 'justify-between', 'rounded-[1rem]', 'bg-[#1d1f25]', 'border', 'border-white/5', 'shadow-inner', 'px-5', 'py-3.5')}>
                      <div>
                        <p className={cn('text-[0.95rem]', 'font-bold', 'text-white')}>{formatCurrency(d.amount, user?.currency || 'INR', true)}</p>
                        <p className={cn('text-[0.7rem]', 'text-slate-400', 'mt-0.5')}>{new Date(d.createdAt).toLocaleDateString()}</p>
                        {(d as any).adminRemark && <p className={cn('mt-1', 'text-[10px]', 'text-rose-400', 'font-medium', 'italic')}>Remark: {(d as any).adminRemark}</p>}
                      </div>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                </div>
              )}

              {history.withdrawals.length > 0 && (
                <div className="mt-4">
                  <p className={cn('mb-2', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-500')}>Withdrawal Requests</p>
                  {history.withdrawals.map((w) => (
                    <div key={w.id} className={cn('mb-2', 'flex', 'items-center', 'justify-between', 'rounded-[1rem]', 'bg-[#1d1f25]', 'border', 'border-white/5', 'shadow-inner', 'px-5', 'py-3.5')}>
                      <div>
                        <p className={cn('text-[0.95rem]', 'font-bold', 'text-white')}>{formatCurrency(w.amount, user?.currency || 'INR', true)}</p>
                        <p className={cn('text-[0.7rem]', 'text-slate-400', 'mt-0.5')}>{new Date(w.createdAt).toLocaleDateString()}</p>
                      </div>
                      <StatusPill status={w.status} />
                    </div>
                  ))}
                </div>
              )}

              {history.transactions.length > 0 && (
                <div className="mt-4">
                  <p className={cn('mb-2', 'text-[0.7rem]', 'font-bold', 'uppercase', 'tracking-[0.1em]', 'text-slate-500')}>Other Transactions</p>
                  {history.transactions.map((t) => (
                    <div key={t.id} className={cn('mb-2', 'flex', 'items-center', 'justify-between', 'rounded-[1rem]', 'bg-[#1d1f25]', 'border', 'border-white/5', 'shadow-inner', 'px-5', 'py-3.5')}>
                      <div>
                        <p className={cn('text-[0.95rem]', 'font-bold', 'text-white')}>{formatCurrency(t.amount, user?.currency || 'INR', true)} <span className={cn('text-xs', 'text-slate-500', 'font-medium', 'ml-1')}>({t.type})</span></p>
                        <p className={cn('text-[0.7rem]', 'text-slate-400', 'mt-0.5')}>{new Date(t.createdAt).toLocaleDateString()}</p>
                        {t.adminRemark && <p className={cn('mt-1', 'text-[10px]', 'text-yellow-500/80', 'italic', 'font-medium')}>{t.adminRemark}</p>}
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                  ))}
                </div>
              )}
              {history.deposits.length === 0 && history.withdrawals.length === 0 && history.transactions.length === 0 && (
                <p className={cn('py-10', 'text-center', 'text-slate-400')}>No transactions yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

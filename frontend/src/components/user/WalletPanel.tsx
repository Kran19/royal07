'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

  const tabs: { id: WalletTab; label: string }[] = [
    { id: 'balance', label: '💰 Balance' },
    { id: 'deposit', label: '↓ Deposit' },
    { id: 'withdraw', label: '↑ Withdraw' },
    { id: 'history', label: '📋 History' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs & Logout */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 rounded-2xl bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-yellow-400 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all ring-1 ring-rose-500/20"
            title="Logout"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>

      {/* Flash Message */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          msg.type === 'ok'
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
            : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Balance Tab */}
      {tab === 'balance' && (
        <div className="rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-6 text-center ring-1 ring-yellow-500/20">
          <p className="text-sm font-bold uppercase tracking-widest text-yellow-400/70">Available Balance</p>
          <p className="mt-2 text-4xl font-black text-white">₹{balance.toLocaleString()}</p>

          <button
            type="button"
            onClick={refreshBalance}
            className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Deposit Tab */}
      {tab === 'deposit' && (
        <div className="space-y-4">
          {depositStep === 'amount' ? (
            <>
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
                <p className="font-bold text-yellow-400 mb-2">How to deposit:</p>
                <ol className="list-decimal ml-4 space-y-1 text-slate-400">
                  <li>Enter the amount you want to deposit</li>
                  <li>Pay via UPI/Bank transfer to our account details below</li>
                  <li>Upload the payment screenshot as proof</li>
                  <li>Admin will verify and credit your account</li>
                </ol>
              </div>

              {platformSettings && (
                <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-400/80">Pay to Account</h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Official</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {platformSettings.bankAccountName && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">A/C Name</p>
                        <p className="text-sm text-white font-mono">{platformSettings.bankAccountName}</p>
                      </div>
                    )}
                    {platformSettings.bankAccountNumber && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Account Number</p>
                        <p className="text-sm text-white font-mono tracking-wider">{platformSettings.bankAccountNumber}</p>
                      </div>
                    )}
                    {platformSettings.bankIfscCode && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">IFSC Code</p>
                        <p className="text-sm text-white font-mono">{platformSettings.bankIfscCode}</p>
                      </div>
                    )}
                    {platformSettings.upiId && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">UPI ID</p>
                        <p className="text-sm text-yellow-400 font-mono select-all">{platformSettings.upiId}</p>
                      </div>
                    )}
                  </div>

                  {platformSettings.qrCodeUrl && (
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Scan to Pay</p>
                      <div className="p-2 bg-white rounded-xl shadow-lg shadow-black/20">
                        <img 
                          src={`${API_BASE}${platformSettings.qrCodeUrl}`} 
                          alt="Payment QR" 
                          className="h-32 w-32 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {platformSettings.paymentInstructions && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Important Note</p>
                      <p className="text-[11px] leading-relaxed text-slate-400 italic">{platformSettings.paymentInstructions}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="amount-input w-full py-3 px-4"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[100, 200, 500, 1000, 2000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepositAmount(String(v))}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      depositAmount === String(v)
                        ? 'bg-yellow-400 text-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    ₹{v}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={loading || !depositAmount}
                onClick={handleRequestDeposit}
                className="primary-btn w-full py-3 text-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Proceed to Upload Proof'}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                ✓ Deposit request created for ₹{depositAmount}. Now upload your payment screenshot.
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Payment Screenshot
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 p-6 text-center hover:border-yellow-500/40 transition-colors"
                >
                  {proofFile ? (
                    <p className="font-semibold text-emerald-300">✓ {proofFile.name}</p>
                  ) : (
                    <>
                      <p className="text-3xl">📷</p>
                      <p className="mt-2 text-sm text-slate-400">Click to upload screenshot</p>
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
                className="primary-btn w-full py-3 text-sm disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Submit Proof'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Withdraw Tab */}
      {tab === 'withdraw' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-bold text-yellow-400 mb-1">Available: <span className="text-white">₹{balance.toLocaleString()}</span></p>
            <p className="text-xs text-slate-400">Admin will manually pay to your UPI/account after review.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Amount (₹)
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 500"
              className="amount-input w-full py-3 px-4"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
              UPI ID or Bank Account
            </label>
            <input
              type="text"
              value={upiAccount}
              onChange={(e) => setUpiAccount(e.target.value)}
              placeholder="e.g. name@upi or 1234567890"
              className="amount-input w-full py-3 px-4"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleWithdraw}
            className="primary-btn w-full py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3 max-h-[75vh] md:max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
          {!history ? (
            <div className="py-10 text-center text-slate-400">Loading...</div>
          ) : (
            <>
              {history.deposits.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Deposit Requests</p>
                  {history.deposits.map((d) => (
                    <div key={d.id} className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">₹{d.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</p>
                        {(d as any).adminRemark && <p className="mt-1 text-[10px] text-rose-400 font-medium italic">Remark: {(d as any).adminRemark}</p>}
                      </div>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                </div>
              )}
              {history.withdrawals.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Withdrawal Requests</p>
                  {history.withdrawals.map((w) => (
                    <div key={w.id} className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">₹{w.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{w.upiOrAccount}</p>
                        <p className="text-xs text-slate-500">{new Date(w.createdAt).toLocaleDateString()}</p>
                        {(w as any).adminRemark && <p className="mt-1 text-[10px] text-rose-400 font-medium italic">Remark: {(w as any).adminRemark}</p>}
                      </div>
                      <StatusPill status={w.status} />
                    </div>
                  ))}
                </div>
              )}
              {history.transactions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Transactions</p>
                  {history.transactions.map((t) => (
                    <div key={t.id} className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">₹{t.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{t.type}</p>
                        {t.adminRemark && <p className="mt-1 text-[10px] text-rose-400 font-medium italic">Remark: {t.adminRemark}</p>}
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                  ))}
                </div>
              )}
              {history.deposits.length === 0 && history.withdrawals.length === 0 && history.transactions.length === 0 && (
                <p className="py-10 text-center text-slate-400">No transactions yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

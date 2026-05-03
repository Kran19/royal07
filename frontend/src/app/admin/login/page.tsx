'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api/api-service';

export default function AdminLoginPage() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { login } = useAuth();
  const router = useRouter();

  // 📡 Real-time Engine Connectivity Check
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiService.getApiBase()}/health`, { cache: 'no-store' });
        setEngineStatus(res.ok ? 'online' : 'offline');
      } catch (err) {
        setEngineStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login({ mobile, password });
      if (response.success && response.data) {
        const { user } = response.data;
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          login(response.data.token, user);
          router.push('/admin/dashboard');
        } else {
          setError('Access Denied: Administrator privileges required.');
        }
      } else {
        setError(response.message || 'Invalid credentials');
      }
    } catch (err: any) {
      console.error('Login connection error:', err);
      setError(`Connection failed: ${err.message || 'Engine unreachable'}. Please verify backend connection.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] font-sans selection:bg-cyan-500/30">
      {/* 🌌 Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* 🛸 Main Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-2xl transition-all hover:border-cyan-500/30">
          {/* Subtle Glow Border Accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Admin <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Portal</span>
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`h-2 w-2 rounded-full ring-4 ${
                engineStatus === 'online' ? 'bg-emerald-500 ring-emerald-500/20 animate-pulse' : 
                engineStatus === 'offline' ? 'bg-rose-500 ring-rose-500/20' : 
                'bg-amber-500 ring-amber-500/20 animate-bounce'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Engine: <span className={
                  engineStatus === 'online' ? 'text-emerald-400' : 
                  engineStatus === 'offline' ? 'text-rose-400' : 
                  'text-amber-400'
                }>{engineStatus}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="group relative">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-cyan-400">
                  Secure Access ID (Mobile)
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-slate-950/50 px-5 py-4 text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="e.g. 7778889911"
                />
              </div>

              <div className="group relative">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-cyan-400">
                  Encryption Key (Password)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-slate-950/50 px-5 py-4 text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-400 border border-rose-500/20 animate-in fade-in slide-in-from-top-2">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 font-bold text-white shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Establish Secure Connection'
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-white/5 pt-6 text-center">
            <button 
              onClick={() => router.push('/user')}
              className="text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
            >
              Back to Lobby
            </button>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600">
          RoyalBet Engine v2.0.4 // Zero Trust Architecture
        </p>
      </div>
    </div>
  );
}

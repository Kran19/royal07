'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/70 text-slate-300">
      {children}
    </span>
  );
}

const MENU_ITEMS = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M3 11h5V17H3zM12 3h5v14h-5zM3 3h5v5H3zM12 11h5v6h-5z" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/admin/monitoring',
    label: 'Live Monitoring',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M3 10h3l2-4 4 8 2-4h3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'User Management',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M7 9a3 3 0 100-6 3 3 0 000 6zm6 2a2 2 0 100-4 2 2 0 000 4zM2.5 16a4.5 4.5 0 019 0M11.5 16a3.5 3.5 0 017 0" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/transactions',
    label: 'Transactions',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M4 6h12M4 10h12M4 14h7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/rounds',
    label: 'Rounds',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <circle cx="10" cy="10" r="6.5" strokeWidth="1.5" />
        <path d="M10 6v4l2.5 2" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/bets',
    label: 'Bets',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M4 15L16 5M6 5h10v10" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M4 15V9M10 15V5M16 15v-7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/wallet',
    label: 'Wallet Requests',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M3 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" strokeWidth="1.5" />
        <circle cx="14" cy="10.5" r="1.5" fill="currentColor" strokeWidth="0" />
      </svg>
    ),
  },
  {
    href: '/admin/audit',
    label: 'Audit Logs',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M6 4h8M6 8h8M6 12h5M5 16h10a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1z" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
        <path d="M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0-3.5v2m0 10v2m7-7h-2M5 10H3m11.95 4.95l-1.4-1.4M6.45 6.45l-1.4-1.4m9.9 0l-1.4 1.4m-7.1 7.1l-1.4 1.4" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({
  isOpen = false,
  onClose,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/5 bg-[#030712]/95 shadow-2xl backdrop-blur-3xl transition-transform duration-300 ${
        isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
      }`}
    >
      <div className="border-b border-white/5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-500/30">
            RB
          </div>
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight text-white">RoyalBet</p>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400/80">
              Admin HQ
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {MENU_ITEMS.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-white ring-1 ring-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-wide">{item.label}</p>
              </div>
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
          <div className="mb-4 text-center">
            <p className="text-sm font-bold text-white">Need help?</p>
            <p className="text-xs text-slate-400">Contact support staff</p>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_16px_rgba(14,165,233,0.4)] transition-transform hover:-translate-y-0.5"
          >
            Support Center
          </button>
        </div>
      </div>
    </aside>
  );
}

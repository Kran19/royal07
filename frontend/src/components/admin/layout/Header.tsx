'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  isMobile?: boolean;
}

const notifications = [
  { id: 1, level: 'warning', message: 'Suspicious activity detected on a user account.' },
  { id: 2, level: 'alert', message: 'Current round is closing in under 20 seconds.' },
  { id: 3, level: 'info', message: 'Daily report export is ready for download.' },
];

export function Header({ onMenuClick, title, isMobile = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notificationOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#030712]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 w-full max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-24 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {isMobile ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M4 6h12M4 10h12M4 14h12" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}

          <div className="min-w-0">
            {title ? (
              <>
                <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {title}
                </h1>
                <p className="hidden text-sm font-medium text-slate-400 sm:block">
                  Production-ready admin workspace
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end lg:flex">
          <label className="relative w-full max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M14.5 14.5L18 18M8.5 15A6.5 6.5 0 108.5 2a6.5 6.5 0 000 13z" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search users, transactions..."
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-[#030712] focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>
        </div>

          <div className="flex shrink-0 items-center gap-3">
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((current) => !current)}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Open notifications"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M10 3a4 4 0 00-4 4v2.4c0 .53-.21 1.04-.58 1.42L4 12h12l-1.42-1.18A2 2 0 0114 9.4V7a4 4 0 00-4-4zm0 14a2.5 2.5 0 002.45-2H7.55A2.5 2.5 0 0010 17z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="absolute right-3 top-3 h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </button>

              {notificationOpen ? (
                <div className="glass-panel-heavy absolute right-0 mt-3 w-[min(92vw,24rem)] rounded-3xl">
                  <div className="border-b border-white/5 px-6 py-5">
                    <p className="font-bold tracking-wide text-white">Notifications</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto px-3 py-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="rounded-2xl px-4 py-3 transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.level === 'warning'
                                ? 'bg-amber-400'
                                : notification.level === 'alert'
                                  ? 'bg-rose-400'
                                  : 'bg-cyan-400'
                            }`}
                          />
                          <p className="text-sm font-medium leading-relaxed text-slate-300">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-1.5 pr-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 font-bold text-white shadow-md">
                {user?.username?.[0]?.toUpperCase() || user?.mobile?.slice(-2) || '??'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user?.username || user?.mobile || 'Unknown User'}</p>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{user?.role || 'PLAYER'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
      </div>
    </header>
  );
}

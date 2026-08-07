'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, Search, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

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
  const [scrolled, setScrolled] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Activate glass effect only after user scrolls — keeps header transparent at top
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen]);

  return (
    <header className={cn('sticky', 'top-0', 'z-30', 'w-full', 'transition-all', 'duration-300', 'ease-in-out')}
      style={{ paddingTop: scrolled ? '12px' : '0', paddingLeft: scrolled ? '20px' : '0', paddingRight: scrolled ? '20px' : '0' }}
    >
      {/* Outer: sticky positioner — always full width, zero visual presence */}
      <div className={cn(
        'w-full transition-all duration-300 ease-in-out',
        scrolled
          ? [
              // Floating glass capsule state (Fully rounded like search bar)
              'rounded-full',
              'bg-white/75 dark:bg-slate-900/75',
              'backdrop-blur-2xl [-webkit-backdrop-filter:blur(32px)]',
              'ring-1 ring-slate-900/5 dark:ring-white/10',
              'shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
            ]
          : 'bg-transparent'
      )}>
        <div className={cn(
          'mx-auto flex w-full items-center justify-between gap-4 px-4 sm:px-6 transition-all duration-300',
          scrolled ? 'h-[52px]' : 'h-16 lg:h-20 lg:px-8'
        )}>

          {/* Left: mobile hamburger */}
          <div className={cn('flex', 'min-w-0', 'items-center', 'gap-4')}>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className={cn('lg:hidden', 'text-slate-900', 'dark:text-slate-100')}
              >
                <Menu className={cn('h-5', 'w-5')} />
              </Button>
            )}
          </div>

          {/* Center: search bar */}
          <div className={cn('hidden', 'flex-1', 'items-center', 'justify-left', 'lg:flex')}>
            <div className={cn('relative', 'w-full', 'max-w-lg')}>
              <Search className={cn('absolute', 'left-4', 'top-1/2', 'h-4', 'w-4', '-translate-y-1/2', 'text-slate-400', 'dark:text-slate-500')} />
              <Input
                type="text"
                placeholder="Search or type a command..."
                className={cn(
                  'pl-11 pr-12 bg-white border-none shadow-sm text-slate-900 placeholder:text-slate-400 dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-100 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-indigo-500/20',
                  scrolled ? 'h-9' : 'h-12'
                )}
              />
              <div className={cn('absolute', 'right-4', 'top-1/2', 'flex', '-translate-y-1/2', 'items-center', 'text-[10px]', 'font-bold', 'text-slate-400')}>
                ⌘ F
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className={cn('flex', 'shrink-0', 'items-center', 'gap-2', 'ml-4')}>
            <ThemeToggle />

            {/* Notification Bell */}
            <div ref={notificationRef} className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNotificationOpen((c) => !c)}
                className={cn(
                  'relative rounded-full border-none bg-white shadow-sm text-slate-600 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white transition-all',
                  scrolled ? 'h-9 w-9' : 'h-11 w-11'
                )}
              >
                <Bell className={scrolled ? 'h-4 w-4' : 'h-5 w-5'} />
                <span className={cn(
                  'absolute rounded-full bg-rose-500 shadow-[0_0_8px_rgba(243,24,36,0.8)]',
                  scrolled ? 'right-2 top-2 h-1.5 w-1.5' : 'right-3 top-3 h-2 w-2'
                )} />
              </Button>

              {notificationOpen && (
                <Card className={cn('absolute', 'right-0', 'mt-3', 'w-[min(92vw,24rem)]', 'overflow-hidden', 'shadow-2xl', 'border-slate-200/80', 'dark:border-slate-800', 'z-50', 'rounded-2xl', 'bg-white/90', 'dark:bg-slate-900/90', 'backdrop-blur-xl')}>
                  <div className={cn('border-b', 'border-slate-100', 'dark:border-slate-800', 'bg-white/80', 'dark:bg-slate-900/80', 'px-6', 'py-4')}>
                    <p className={cn('font-bold', 'tracking-wide', 'text-slate-900', 'dark:text-white')}>Notifications</p>
                  </div>
                  <div className={cn('max-h-80', 'overflow-y-auto', 'p-2', 'bg-white', 'dark:bg-slate-950')}>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn('rounded-xl', 'px-4', 'py-3', 'transition-colors', 'hover:bg-slate-100', 'dark:hover:bg-slate-800/50', 'cursor-pointer')}
                      >
                        <div className={cn('flex', 'items-start', 'gap-3')}>
                          <span
                            className={cn(
                              "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm",
                              notification.level === 'warning' && "bg-amber-400 shadow-amber-400/50",
                              notification.level === 'alert' && "bg-rose-400 shadow-rose-400/50",
                              notification.level === 'info' && "bg-indigo-400 shadow-indigo-400/50"
                            )}
                          />
                          <p className={cn('text-sm', 'font-medium', 'leading-relaxed', 'text-slate-600', 'dark:text-slate-300')}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Avatar */}
            <div className={cn(
              'hidden items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800/80 sm:flex shrink-0 transition-all',
              scrolled ? 'h-9 w-9' : 'h-11 w-11'
            )}>
              <div className={cn(
                'flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md cursor-pointer transition-all',
                scrolled ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
              )}>
                {user?.username?.[0]?.toUpperCase() || user?.mobile?.slice(-2) || <User className={cn('h-4', 'w-4')} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

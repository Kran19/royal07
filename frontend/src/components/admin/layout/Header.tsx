'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, Search, Menu, LogOut, User, Users, Dices, CircleDot, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api/api-service';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  isMobile?: boolean;
}

export function Header({ onMenuClick, title, isMobile = false }: HeaderProps) {
  const { user, logout } = useAuth();
  
  // Notifications
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Glass effect
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiService.getNotifications();
        if (res.success) {
          setNotifications(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    fetchNotifications();
  }, []);

  // Debounced Search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await apiService.globalSearch(searchQuery);
        if (res.success) {
          setSearchResults(res.data || []);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen, searchOpen]);

  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'USER': return <Users className="h-4 w-4 text-indigo-500" />;
      case 'BET': return <Dices className="h-4 w-4 text-emerald-500" />;
      case 'ROUND': return <CircleDot className="h-4 w-4 text-rose-500" />;
      default: return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <header className={cn('sticky', 'top-0', 'z-30', 'w-full', 'border-b', 'border-slate-200', 'dark:border-slate-800', 'bg-white', 'dark:bg-slate-950')}>
      <div className="w-full">
        <div className={cn(
          'mx-auto flex w-full items-center justify-between gap-4 px-4 sm:px-6 h-16 lg:h-20 lg:px-8'
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
          <div className={cn('hidden', 'flex-1', 'items-center', 'justify-left', 'lg:flex')} ref={searchRef}>
            <div className={cn('relative', 'w-full', 'max-w-lg')}>
              <Search className={cn('absolute', 'left-4', 'top-1/2', 'h-4', 'w-4', '-translate-y-1/2', 'text-slate-400', 'dark:text-slate-500')} />
              <Input
                type="text"
                placeholder="Search users, bets, rounds..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className={cn(
                  'pl-11 pr-12 bg-slate-100/50 border-none shadow-sm text-slate-900 placeholder:text-slate-400 dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-100 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-indigo-500/20',
                  'h-10'
                )}
              />
              <div className={cn('absolute', 'right-4', 'top-1/2', 'flex', '-translate-y-1/2', 'items-center', 'text-[10px]', 'font-bold', 'text-slate-400')}>
                {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : '⌘ F'}
              </div>

              {/* Search Dropdown */}
              {searchOpen && searchQuery.length >= 2 && (
                <Card className={cn('absolute', 'top-full', 'left-0', 'right-0', 'mt-2', 'overflow-hidden', 'shadow-2xl', 'border-slate-200/80', 'dark:border-slate-800', 'z-50', 'rounded-2xl', 'bg-white/95', 'dark:bg-slate-900/95', 'backdrop-blur-xl', 'p-2')}>
                  {isSearching && searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar">
                      {searchResults.map((res, i) => (
                        <Link key={i} href={res.url} onClick={() => setSearchOpen(false)}>
                          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
                                {getSearchIcon(res.type)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1">{res.label}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">{res.subLabel}</p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchQuery}"</div>
                  )}
                </Card>
              )}
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
                  'relative rounded-full border-none bg-slate-100/50 shadow-sm text-slate-600 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white transition-all',
                  'h-10 w-10'
                )}
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className={cn(
                    'absolute rounded-full bg-rose-500 shadow-[0_0_8px_rgba(243,24,36,0.8)]',
                    'right-2.5 top-2.5 h-2 w-2'
                  )} />
                )}
              </Button>

              {notificationOpen && (
                <Card className={cn('absolute', 'right-0', 'mt-3', 'w-[min(92vw,24rem)]', 'overflow-hidden', 'shadow-2xl', 'border-slate-200/80', 'dark:border-slate-800', 'z-50', 'rounded-2xl', 'bg-white/95', 'dark:bg-slate-900/95', 'backdrop-blur-xl')}>
                  <div className={cn('border-b', 'border-slate-100', 'dark:border-slate-800', 'bg-white/80', 'dark:bg-slate-900/80', 'px-6', 'py-4', 'flex', 'items-center', 'justify-between')}>
                    <p className={cn('font-bold', 'tracking-wide', 'text-slate-900', 'dark:text-white')}>System Alerts</p>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-1 rounded-full">{notifications.length}</span>
                  </div>
                  <div className={cn('max-h-80', 'overflow-y-auto', 'p-2', 'bg-white/50', 'dark:bg-slate-950/50')}>
                    {notifications.length > 0 ? notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className={cn('rounded-xl', 'px-4', 'py-3', 'transition-colors', 'hover:bg-slate-100', 'dark:hover:bg-slate-800/50', 'cursor-pointer')}
                      >
                        <div className={cn('flex', 'items-start', 'gap-3')}>
                          <span
                            className={cn(
                              "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm",
                              notification.type === 'WARNING' && "bg-amber-400 shadow-amber-400/50",
                              notification.type === 'CRITICAL' && "bg-rose-400 shadow-rose-400/50",
                              (notification.type === 'INFO' || !notification.type) && "bg-indigo-400 shadow-indigo-400/50"
                            )}
                          />
                          <div>
                            <p className={cn('text-sm', 'font-medium', 'leading-relaxed', 'text-slate-700', 'dark:text-slate-200')}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-6 text-center text-sm text-slate-500">No new notifications</div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Avatar */}
            <div className={cn(
              'hidden items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800/80 sm:flex shrink-0 transition-all',
              'h-10 w-10'
            )}>
              <div className={cn(
                'flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md cursor-pointer transition-all',
                'h-9 w-9 text-sm'
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

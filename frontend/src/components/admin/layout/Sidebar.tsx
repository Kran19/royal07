'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Users,
  ArrowRightLeft,
  CircleDot,
  Dices,
  BarChart3,
  History,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Monitor,
  Wallet,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MENU_GROUPS = [
  {
    label: 'Main',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/monitoring', label: 'Live Monitoring', icon: Activity },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
    ]
  },
  {
    label: 'Integrations',
    items: [
      { href: '/admin/operators', label: 'Operators', icon: Server },
      { href: '/admin/operators/transactions', label: 'Callback Logs', icon: Activity },
    ]
  },
  {
    label: 'Tools',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/transactions', label: 'Transactions', icon: ArrowRightLeft },
      { href: '/admin/rounds', label: 'Rounds', icon: CircleDot },
      { href: '/admin/bets', label: 'Bets', icon: Dices },
    ]
  },
  {
    label: 'System',
    items: [
      { href: '/admin/audit', label: 'Audit Logs', icon: ShieldCheck },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]
  }
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
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/admin/operators' && pathname.startsWith('/admin/operators/transactions')) {
      return false;
    }
    return pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-white dark:bg-slate-950 transition-transform duration-300",
        isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
      )}
    >
      <div className={cn('p-8', 'flex', 'items-center', 'gap-3')}>
        <div className={cn('flex', 'h-8', 'w-8', 'shrink-0', 'items-center', 'justify-center', 'rounded-lg', 'bg-indigo-600', 'text-sm', 'font-black', 'text-white', 'shadow-md', 'shadow-indigo-600/20')}>
          <Dices className={cn('w-5', 'h-5')} />
        </div>
        <div className="min-w-0">
          <p className={cn('text-xl', 'font-black', 'tracking-tighter', 'text-slate-900', 'dark:text-white', 'uppercase')}>Elevator</p>
        </div>
      </div>

      <nav className={cn('flex-1', 'space-y-6', 'overflow-y-auto', 'px-6', 'py-4', 'custom-scrollbar')}>
        {MENU_GROUPS.map((group) => (
          <div key={group.label} className="space-y-3">
            <h4 className={cn('text-sm', 'font-semibold', 'text-slate-900', 'dark:text-slate-200')}>
              {group.label}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-full px-4 py-2.5 transition-all text-sm font-medium",
                      active
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300")} />
                    <div className={cn('flex-1', 'truncate')}>{item.label}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* <div className="p-6">
        <div className={cn('rounded-2xl', 'border', 'border-slate-100', 'bg-[#f8faff]', 'p-5', 'dark:border-slate-800', 'dark:bg-slate-900/50')}>
          <div className={cn('mb-4', 'flex', 'items-center', 'justify-center')}>
            <div className={cn('flex', 'h-10', 'w-10', 'items-center', 'justify-center', 'rounded-xl', 'bg-white', 'shadow-sm', 'border', 'border-slate-100', 'dark:bg-slate-800', 'dark:border-slate-700')}>
              <ShieldCheck className={cn('h-5', 'w-5', 'text-indigo-600')} />
            </div>
          </div>
          <p className={cn('text-center', 'text-sm', 'font-bold', 'text-slate-900', 'dark:text-white')}>Need Support?</p>
          <p className={cn('text-center', 'text-xs', 'text-slate-500', 'mb-4', 'mt-1')}>Chat with our engineering team for technical assistance.</p>
          <Button className={cn('w-full', 'rounded-full', 'bg-slate-900', 'text-white', 'hover:bg-slate-800', 'dark:bg-indigo-600', 'dark:hover:bg-indigo-700', 'text-xs', 'font-semibold')} size="sm">
            Contact Support
          </Button>
        </div>
      </div> */}
    </aside>
  );
}

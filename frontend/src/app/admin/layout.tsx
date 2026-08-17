'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';

const ROUTE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/bets': 'Betting History',
  '/admin/transactions': 'Transaction History',
  '/admin/rounds': 'Game Rounds',
  '/admin/analytics': 'Advanced Analytics',
  '/admin/monitoring': 'Live System Monitoring',
  '/admin/operators': 'Operators',
  '/admin/operators/transactions': 'Operator Callback Logs',
  '/admin/audit': 'System Audit Logs',
  '/admin/settings': 'Platform Settings',
  '/admin/wallet': 'Wallet Operations',
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = ROUTE_TITLES[pathname] || 'RoyalBet Admin';

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminLayout title={title}>
      {children}
    </AdminLayout>
  );
}

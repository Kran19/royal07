'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';

const ROUTE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/bets': 'Betting History',
  '/admin/transactions': 'Financial Transactions',
  '/admin/rounds': 'Game Rounds',
  '/admin/analytics': 'Platform Analytics',
  '/admin/monitoring': 'Live System Monitoring',
  '/admin/audit': 'Audit Logs',
  '/admin/settings': 'System Settings',
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

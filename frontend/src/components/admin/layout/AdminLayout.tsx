'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

import { useAuth } from '@/context/AuthContext';

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncLayout = () => {
      setIsMobile(mediaQuery.matches);
      setSidebarOpen(!mediaQuery.matches);
    };
    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);
    return () => mediaQuery.removeEventListener('change', syncLayout);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null; // AuthProvider handles redirect logic


  return (
    <div className="relative min-h-screen bg-transparent text-slate-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {sidebarOpen && isMobile ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex min-h-screen flex-col transition-[margin] duration-300 lg:ml-72">
        <Header
          title={title}
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen((current) => !current)}
        />

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div className="flex flex-col gap-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

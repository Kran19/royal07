'use client';

import React, { useEffect, useRef } from 'react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function DetailDrawer({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
}: DetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const widthClass = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#030712]/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full ${widthClass} flex-col border-l border-white/10 bg-[#030712]/95 shadow-2xl backdrop-blur-3xl`}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/5 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
            <p className="mt-1 text-sm font-medium text-slate-400">Review details and take action.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close details"
          >
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M5 5L15 15" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </>
  );
}

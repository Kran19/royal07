'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  onClick,
  loading,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-3xl p-6 sm:p-8 ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_8px_32px_rgba(14,165,233,0.15)]' : ''
      }`}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold tracking-wider text-slate-400">
            {title}
          </p>
        </div>
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/50 text-xl text-cyan-400 shadow-inner">
            {icon}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="h-10 animate-pulse rounded-xl bg-slate-700/50" />
      ) : (
        <p className="text-4xl font-extrabold tracking-tight text-white">{value}</p>
      )}

      {change ? (
        <div className="mt-5 flex items-center gap-2 text-sm font-medium">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${change.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <span>{change.isPositive ? '↗' : '↘'}</span>
            {Math.abs(change.value)}%
          </span>
          <span className="text-slate-500">vs last period</span>
        </div>
      ) : null}
    </div>
  );
}

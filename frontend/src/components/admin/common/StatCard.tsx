'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
    <Card 
      onClick={onClick} 
      className={cn(
        "group relative flex flex-col justify-between p-6 h-[180px] transition-all duration-300 overflow-hidden",
        "border border-white/10 dark:border-white/5",
        "bg-white dark:bg-[#1a1f2c] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
        onClick && "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.2)]"
      )}
    >
      {/* Premium background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 dark:from-indigo-500/5 dark:via-transparent dark:to-cyan-500/5 pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative z-10 flex items-center justify-between w-full">
        <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 shadow-sm border border-slate-200 dark:border-slate-700/50 text-indigo-500 dark:text-indigo-400 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
          {icon ? icon : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          )}
        </div>
      </div>
      
      <div className="relative z-10 flex items-end justify-between w-full">
        <div className="flex flex-col">
          {loading ? (
            <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/50" />
          ) : (
            <h2 className="text-[2.25rem] font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{value}</h2>
          )}
          {change && (
            <div className="mt-2 flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 w-fit px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              <span className={cn(
                "text-[11px] font-bold",
                change.isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
              )}>
                {change.isPositive ? '↗' : '↘'} {Math.abs(change.value)}%
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

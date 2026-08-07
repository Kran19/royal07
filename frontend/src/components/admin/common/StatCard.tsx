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
        "relative flex flex-col justify-between p-6 h-[180px] transition-transform duration-300", 
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
      )}
    >
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          {loading ? (
            <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ) : (
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h2>
          )}
          {change && (
            <p className="mt-1 text-xs font-medium">
              <span className={change.isPositive ? "text-emerald-500" : "text-rose-500"}>
                {change.isPositive ? '+' : '-'}{Math.abs(change.value)}%
              </span>{" "}
              <span className="text-slate-400">vs last month</span>
            </p>
          )}
        </div>
        
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-900 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-transform group-hover:scale-105">
          {icon ? icon : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          )}
        </div>
      </div>
    </Card>
  );
}

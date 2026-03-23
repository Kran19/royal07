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

export function StatCard({ title, value, change, icon, onClick, loading }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-cyan-400">{icon}</div>}
      </div>

      {loading ? (
        <div className="h-8 bg-slate-700 rounded animate-pulse mb-2" />
      ) : (
        <div className="text-3xl font-bold text-white mb-2">{value}</div>
      )}

      {change && (
        <div className={`text-sm font-medium ${change.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {change.isPositive ? '▲' : '▼'} {Math.abs(change.value)}%
        </div>
      )}
    </div>
  );
}

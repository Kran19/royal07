'use client';

import React from 'react';

interface BadgeProps {
  variant:
    | 'default'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'purple'
    | 'cyan';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ variant, children, size = 'sm', className = '' }: BadgeProps) {
  const baseClass =
    'inline-flex items-center rounded-full font-bold uppercase tracking-widest transition-colors';

  const variantClass = {
    default: 'bg-slate-800/80 text-slate-300 ring-1 ring-inset ring-slate-600/50',
    success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    danger: 'bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
    warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    info: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
    purple: 'bg-fuchsia-500/15 text-fuchsia-400 ring-1 ring-inset ring-fuchsia-500/30 shadow-[0_0_8px_rgba(217,70,239,0.2)]',
    cyan: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-inset ring-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]',
  }[variant];

  const sizeClass = {
    sm: 'px-2.5 py-1 text-[10px]',
    md: 'px-3.5 py-1.5 text-xs',
  }[size];

  return <span className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}>{children}</span>;
}

interface StatusIndicatorProps {
  status:
    | 'active'
    | 'inactive'
    | 'pending'
    | 'error'
    | 'success'
    | 'warning';
  label?: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors = {
    active: 'bg-emerald-400 shadow-emerald-400/60',
    inactive: 'bg-slate-500 shadow-slate-500/40',
    pending: 'bg-amber-400 shadow-amber-400/60',
    error: 'bg-rose-400 shadow-rose-400/60',
    success: 'bg-emerald-400 shadow-emerald-400/60',
    warning: 'bg-amber-400 shadow-amber-400/60',
  }[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${colors} shadow-md`} />
      <span className="text-sm font-medium text-slate-200">
        {label || status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  variant = 'default',
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  const variantClass = {
    default: 'from-cyan-500 to-blue-500',
    success: 'from-emerald-500 to-teal-500',
    danger: 'from-rose-500 to-red-500',
    warning: 'from-amber-500 to-orange-500',
  }[variant];

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        {label ? <p className="text-sm font-medium text-slate-200">{label}</p> : <span />}
        <p className="text-xs text-slate-400">
          {value.toLocaleString()} / {max.toLocaleString()}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-slate-700/60 bg-slate-900/75">
        <div
          className={`h-full bg-gradient-to-r ${variantClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

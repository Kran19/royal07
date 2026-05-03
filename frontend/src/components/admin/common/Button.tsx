'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClass =
    'inline-flex items-center justify-center gap-2 rounded-xl border font-bold tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50';

  const variantClass = {
    primary:
      'border-cyan-400/35 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_4px_20px_rgba(14,165,233,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(14,165,233,0.5)] active:translate-y-0',
    secondary:
      'border-white/10 bg-white/5 text-slate-200 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0',
    danger:
      'border-rose-400/30 bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_20px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(244,63,94,0.5)] active:translate-y-0',
    success:
      'border-emerald-400/30 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] active:translate-y-0',
  }[variant];

  const sizeClass = {
    sm: 'min-h-10 px-4 text-xs',
    md: 'min-h-12 px-6 text-sm',
    lg: 'min-h-14 px-8 text-base',
  }[size];

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

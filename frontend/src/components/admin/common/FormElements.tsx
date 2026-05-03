'use client';

import React from 'react';

function FieldWrapper({
  label,
  error,
  children,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full space-y-2.5">
      {label ? (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-sm font-medium text-rose-400">{error}</p> : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <input
        className={`min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white placeholder:text-slate-500 focus:bg-[#030712] focus:border-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 ${error ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/10' : ''} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <select
        className={`min-h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white focus:border-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 ${error ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/10' : ''} ${className}`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <textarea
        className={`min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-white placeholder:text-slate-500 focus:bg-[#030712] focus:border-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 ${error ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/10' : ''} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

'use client';

import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="glass-panel relative flex flex-col gap-5 overflow-hidden rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-cyan-500/20 blur-[80px]"></div>
      <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-blue-500/20 blur-[80px]"></div>
      
      <div className="relative z-10 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="relative z-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <section
      className={`glass-panel overflow-hidden rounded-3xl ${className}`}
    >
      {title || description || actions ? (
        <div className="flex flex-col gap-4 border-b border-slate-700/40 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            {title ? (
              <h3 className="text-lg font-bold tracking-wide text-white">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-sm text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </section>
  );
}

export function MobileActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}

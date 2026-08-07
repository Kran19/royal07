'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pb-6">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[32px] font-black text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end mt-4 lg:mt-0">
          {actions}
        </div>
      )}
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
    <Card className={className}>
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding && "p-0")}>
        {children}
      </CardContent>
    </Card>
  );
}

export function MobileActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}

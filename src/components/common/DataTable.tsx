'use client';

import React, { useState } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: boolean;
  onRowClick?: (row: T) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  empty,
  onRowClick,
  onSort,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: keyof T) => {
    if (!onSort) return;

    let newDirection: SortDirection;
    if (sortKey === key) {
      newDirection = sortDirection === 'asc' ? 'desc' : null;
    } else {
      newDirection = 'asc';
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);

    if (newDirection) {
      onSort(key, newDirection);
    }
  };

  return (
    <div className="overflow-x-auto border border-slate-700 rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50 border-b border-slate-700">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-6 py-3 text-left text-sm font-semibold text-slate-300 ${col.sortable ? 'cursor-pointer hover:bg-slate-700/50' : ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{ width: col.width }}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border border-cyan-400 border-t-transparent" />
                </div>
              </td>
            </tr>
          ) : empty || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b border-slate-700 hover:bg-slate-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4 text-sm text-slate-200">
                    {col.render
                      ? col.render((row as any)[col.key], row)
                      : String((row as any)[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

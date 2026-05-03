'use client';

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  width?: string;
}

interface AdminTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export default function AdminTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  isLoading,
}: AdminTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-[#090b12]/50 backdrop-blur-md rounded-xl border border-white/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbbf24]"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-[#090b12]/50 backdrop-blur-md rounded-xl border border-white/5 text-white/40">
        No records found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#090b12]/30 backdrop-blur-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/5">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`p-4 text-xs font-bold uppercase tracking-wider text-white/60 ${col.className || ''}`}
                style={col.width ? { width: col.width } : {}}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-white/5 transition-colors cursor-default ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, idx) => (
                <td key={idx} className={`p-4 text-sm text-white/90 ${col.className || ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

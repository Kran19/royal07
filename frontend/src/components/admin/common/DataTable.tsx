'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  pageSize?: number;
  title?: string;
  actions?: React.ReactNode;
}

export function DataTable<T extends { id: string | number }>(props: DataTableProps<T>) {
  const { 
    columns, 
    data, 
    loading, 
    onRowClick, 
    searchable = false, 
    searchPlaceholder = 'Search records...',
    pagination = false,
    pageSize = 10,
    title,
    actions
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    const safeData = data || [];
    if (!searchQuery) return safeData;
    return safeData.filter((row) => {
      return Object.values(row).some((val) => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [data, searchQuery]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pagination, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const renderLoading = () => (
    <div className="w-full space-y-3 p-1">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="w-full py-24 flex flex-col items-center justify-center text-center bg-[#090b12]/10 rounded-3xl border border-white/5 backdrop-blur-sm">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 group transition-transform hover:scale-110">
        <svg className="w-10 h-10 text-white/20 group-hover:text-cyan-400/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-bold tracking-tight text-white/60">No active records found</p>
      <p className="mt-1 text-xs text-white/30">Adjust your search or filter to see more data.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {(searchable || title || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          {title && <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>}
          <div className="flex flex-1 items-center gap-3 sm:max-w-md ml-auto">
            {searchable && (
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-cyan-400/60 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full h-11 pl-11 pr-4 rounded-2xl border border-white/5 bg-white/5 text-sm font-medium text-white transition-all focus:bg-white/10 focus:border-white/10 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-white/20 outline-none"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {loading ? renderLoading() : paginatedData.length === 0 ? renderEmpty() : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#090b12]/30 backdrop-blur-2xl shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 select-none ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                      }`}
                      style={col.width ? { width: col.width } : {}}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick?.(row)}
                    className={`group transition-all duration-300 ${
                      onRowClick ? 'cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.08]' : ''
                    }`}
                  >
                    {columns.map((col, idx) => (
                      <td
                        key={idx}
                        className={`px-6 py-4 text-[13px] font-medium text-white/70 group-hover:text-white transition-colors duration-300 ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {col.render
                          ? col.render((row as any)[col.key], row)
                          : String((row as any)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.01]">
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest">
                Page <span className="text-white/60">{currentPage}</span> of <span className="text-white/60">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/5 bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/5 bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ReactTabulator, reactFormatter } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'tabulator-tables/dist/css/tabulator_midnight.min.css';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  hozAlign?: 'left' | 'center' | 'right';
  headerSort?: boolean;
  excludeFromExport?: boolean;
  exportFormat?: (value: any, row: T) => string;
}

interface TabulatorTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  paginationSize?: number;
  height?: string | number;
  title?: string;
  showSearch?: boolean;
  showExport?: boolean;
}

// Wrapper for React formatter
function CellWrapper(props: any) {
  const rowData = props.cell.getData();
  const value = props.cell.getValue();
  const def = props.cell.getColumn().getDefinition();
  const customRender = def.formatterParams?.customRender;
  
  if (customRender) {
    return <>{customRender(value, rowData)}</>;
  }
  return <>{String(value ?? '-')}</>;
}

// SVG Icons as components
const SearchIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="8.5" cy="8.5" r="6" />
    <path d="M13 13l4.5 4.5" strokeLinecap="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CsvIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ExcelIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 12l4 6M14 12l-4 6" />
  </svg>
);

const PdfIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

export default function TabulatorClient<T>({
  columns,
  data,
  loading = false,
  onRowClick,
  paginationSize = 10,
  height = 'auto',
  title,
  showSearch = true,
  showExport = true,
}: TabulatorTableProps<T>) {
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const tableRef = useRef<any>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (isClient && tableRef.current?.table && data) {
      tableRef.current.table.setData(data);
    }
  }, [data, isClient]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search handler — filters all visible columns
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!tableRef.current?.table) return;
    const table = tableRef.current.table;

    if (!term.trim()) {
      table.clearFilter();
      return;
    }

    const fields = columns.map(c => c.key as string);
    table.setFilter([
      fields.map(field => ({ field, type: 'like', value: term })),
    ]);
  }, [columns]);

  const getExportData = useCallback(() => {
    // Attempt to get active (filtered/sorted) data from the Tabulator instance
    const table = tableRef.current?.table || tableRef.current;
    if (table && typeof table.getData === 'function') {
      try {
        return table.getData('active');
      } catch (e) {}
    }
    // Fallback to raw data if table instance is unresolvable
    return data || [];
  }, [data]);

  // Export functions
  const handleExportCSV = useCallback(() => {
    try {
      const tableData = getExportData();
      const exportCols = columns.filter(c => !c.excludeFromExport && c.label !== 'Actions');
      const headers = exportCols.map(c => c.label);
      
      const csvRows = tableData.map((row: any) =>
        exportCols.map(c => {
          let val = row[c.key as string];
          if (c.exportFormat) val = c.exportFormat(val, row);
          else if (val === null || val === undefined) val = '';
          else if (typeof val === 'object') val = val.mobile || val.name || JSON.stringify(val);
          
          // Escape quotes and wrap in quotes if contains comma
          const strVal = String(val).replace(/"/g, '""');
          return `"${strVal}"`;
        }).join(',')
      );
      
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title || 'export'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
    setExportOpen(false);
  }, [columns, title]);

  const handleExportExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const tableData = getExportData();
      const exportCols = columns.filter(c => !c.excludeFromExport && c.label !== 'Actions');
      const headers = exportCols.map(c => c.label);
      
      const rows = tableData.map((row: any) =>
        exportCols.map(c => {
          let val = row[c.key as string];
          if (c.exportFormat) return c.exportFormat(val, row);
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return val.mobile || val.name || JSON.stringify(val);
          return String(val);
        })
      );
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${title || 'export'}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
    setExportOpen(false);
  }, [columns, title]);

  const handleExportPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape' });
      const tableData = getExportData();
      const exportCols = columns.filter(c => !c.excludeFromExport && c.label !== 'Actions');
      const headers = exportCols.map(c => c.label);
      
      const rows = tableData.map((row: any) =>
        exportCols.map(c => {
          let val = row[c.key as string];
          if (c.exportFormat) return c.exportFormat(val, row);
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return val.mobile || val.name || JSON.stringify(val);
          return String(val);
        })
      );
      doc.setFontSize(16);
      doc.text(title || 'Export', 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      doc.save(`${title || 'export'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setExportOpen(false);
  }, [columns, title]);

  if (!isClient) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        Loading table...
      </div>
    );
  }

  const tabulatorCols: any[] = columns.map(c => ({
    title: c.label,
    field: c.key as string,
    width: c.width ? (c.width.endsWith('px') ? parseInt(c.width) : c.width) : undefined,
    headerSort: c.headerSort !== undefined ? c.headerSort : !!c.sortable,
    hozAlign: c.hozAlign || 'left',
    formatter: c.render ? reactFormatter(<CellWrapper />) : undefined,
    formatterParams: c.render ? ({ customRender: c.render } as any) : undefined,
  }));

  const options: any = {
    layout: 'fitColumns',
    pagination: true,
    paginationMode: 'local',
    paginationSize: paginationSize,
    paginationSizeSelector: [10, 20, 50, 100],
    movableColumns: true,
    height: height,
    placeholder: "<div style='padding:2rem;color:#64748b;font-weight:500;text-align:center'>No records found</div>",
    paginationCounter: function (_pageSize: number, currentRow: number, _currentPage: number, totalRows: number) {
      return `Showing ${currentRow}–${Math.min(currentRow + _pageSize - 1, totalRows)} of ${totalRows} records`;
    },
  };

  return (
    <div className="tabulator-premium-wrapper">
      {/* Toolbar: Search + Export */}
      {(showSearch || showExport) && (
        <div className="tabulator-toolbar">
          {showSearch && (
            <div className="tabulator-search">
              <span className="tabulator-search-icon"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search across all columns..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="tabulator-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="tabulator-search-clear"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          {showExport && (
            <div className="tabulator-export-wrapper" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="tabulator-export-btn"
              >
                <DownloadIcon />
                <span>Export</span>
                <svg className={`h-3 w-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {exportOpen && (
                <div className="tabulator-export-dropdown">
                  <button type="button" onClick={handleExportCSV} className="tabulator-export-item">
                    <CsvIcon />
                    <div>
                      <p className="font-semibold">CSV</p>
                      <p className="text-xs text-slate-500">Comma-separated values</p>
                    </div>
                  </button>
                  <button type="button" onClick={handleExportExcel} className="tabulator-export-item">
                    <ExcelIcon />
                    <div>
                      <p className="font-semibold text-emerald-400">Excel</p>
                      <p className="text-xs text-slate-500">Microsoft Excel (.xlsx)</p>
                    </div>
                  </button>
                  <button type="button" onClick={handleExportPDF} className="tabulator-export-item">
                    <PdfIcon />
                    <div>
                      <p className="font-semibold text-rose-400">PDF</p>
                      <p className="text-xs text-slate-500">Portable Document Format</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="tabulator-table-area relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-b-xl">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading data...
            </div>
          </div>
        )}
        <ReactTabulator
          onRef={(ref) => (tableRef.current = ref)}
          data={data}
          columns={tabulatorCols}
          options={options}
          events={{
            rowClick: (e: any, row: any) => {
              if (onRowClick) onRowClick(row.getData());
            }
          }}
        />
      </div>

      <style jsx global>{`
        /* === WRAPPER === */
        .tabulator-premium-wrapper {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          background: #0f172a; /* Solid deep background */
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.4),
            0 4px 6px -2px rgba(0, 0, 0, 0.2);
        }

        /* === TOOLBAR === */
        .tabulator-toolbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 28px; /* High-end spacious padding */
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: #1e293b; 
        }

        /* Search */
        .tabulator-search {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .tabulator-search-icon {
          position: absolute;
          left: 18px; /* Adjusted for larger input */
          color: #64748b;
          pointer-events: none;
          display: flex;
        }
        .tabulator-search-input {
          width: 100%;
          height: 52px; /* Taller search input */
          padding: 0 48px 0 52px;
          background: #020617; 
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #f8fafc;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }
        .tabulator-search-input::placeholder {
          color: #475569;
        }
        .tabulator-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .tabulator-search-clear {
          position: absolute;
          right: 16px;
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .tabulator-search-clear:hover {
          color: #f1f5f9;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Export */
        .tabulator-export-wrapper {
          position: relative;
        }
        .tabulator-export-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 52px; /* Matches search height */
          padding: 0 24px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          color: #93c5fd;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tabulator-export-btn:hover {
          background: rgba(59, 130, 246, 0.18);
          border-color: rgba(59, 130, 246, 0.35);
          color: #bfdbfe;
        }
        .tabulator-export-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          width: 260px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 8px;
          z-index: 50;
          box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.6);
          animation: dropdownFadeIn 0.15s ease-out;
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tabulator-export-item {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          border-radius: 10px;
          color: #e2e8f0;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .tabulator-export-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* === TABLE CORE === */
        .tabulator-table-area .tabulator {
          background-color: transparent !important;
          border: none !important;
          font-family: inherit !important;
          font-size: 0.9rem !important;
          width: 100% !important;
        }

        /* Header */
        .tabulator-table-area .tabulator-header {
          background-color: #020617 !important; 
          border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
          color: #cbd5e1 !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          font-size: 0.75rem !important;
        }
        .tabulator-table-area .tabulator-col {
          background-color: transparent !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .tabulator-table-area .tabulator-col-content {
          padding: 20px 24px !important; /* Spacious header cells */
        }

        /* Rows */
        .tabulator-table-area .tabulator-row {
          background-color: #0f172a !important; 
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          min-height: 64px !important; /* Taller rows */
          color: #f1f5f9 !important;
          transition: background-color 0.15s;
        }
        .tabulator-table-area .tabulator-row:nth-child(even) {
          background-color: #1e293b !important; 
        }
        .tabulator-table-area .tabulator-row.tabulator-selectable:hover {
          background-color: #334155 !important; 
          cursor: pointer;
        }
        .tabulator-table-area .tabulator-cell {
          padding: 16px 24px !important; /* Spacious row cells */
          border-right: none !important;
        }

        /* Footer / Pagination */
        .tabulator-table-area .tabulator-footer {
          background-color: #020617 !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #94a3b8 !important;
          padding: 16px 28px !important;
        }
        .tabulator-table-area .tabulator-page {
          background: #1e293b !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #f1f5f9 !important;
          border-radius: 10px !important;
          margin: 0 5px !important;
          padding: 8px 16px !important;
          font-weight: 600 !important;
          transition: all 0.2s;
        }
        .tabulator-table-area .tabulator-page.active {
          background: #3b82f6 !important;
          border-color: #2563eb !important;
          color: white !important;
        }
        .tabulator-table-area .tabulator-page:hover:not(.active) {
          background: #334155 !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .tabulator-table-area .tabulator-paginator {
          color: #e2e8f0 !important;
        }
        .tabulator-table-area .tabulator-page-size {
          background: #1e293b !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #f8fafc !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          font-size: 0.9rem !important;
          margin: 0 10px !important;
          outline: none;
          cursor: pointer;
        }
        .tabulator-table-area .tabulator-page-size:focus {
          border-color: #3b82f6 !important;
        }
        .tabulator-table-area .tabulator-pagination-counter {
          color: #94a3b8 !important;
          font-size: 0.9rem !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
}

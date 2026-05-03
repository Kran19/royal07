'use client';

import React, { useEffect, useState } from 'react';
import { ReactTabulator, reactFormatter } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'tabulator-tables/dist/css/tabulator_midnight.min.css';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
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

// Wrapper for React formatter
function CellWrapper(props: any) {
  const rowData = props.cell.getData();
  const value = props.cell.getValue();
  const def = props.cell.getColumn().getDefinition();
  if (def.customRender) {
    return <>{def.customRender(value, rowData)}</>;
  }
  return <>{String(value ?? '-')}</>;
}

export default function TabulatorClient<T extends { id: string }>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const tabulatorCols = columns.map(c => ({
    title: c.label,
    field: c.key as string,
    width: c.width ? parseInt(c.width.replace('px', '')) : undefined,
    headerSort: !!c.sortable,
    formatter: reactFormatter(<CellWrapper />),
    customRender: c.render, // Custom prop for CellWrapper
  }));

  const options = {
    layout: 'fitColumns',
    responsiveLayout: 'collapse',
    pagination: 'local',
    paginationSize: 10,
    paginationSizeSelector: [10, 20, 50, 100],
    movableColumns: true,
  };

  return (
    <div className="tabulator-custom-wrapper">
      <ReactTabulator
        data={data}
        columns={tabulatorCols}
        options={options}
        events={{
          rowClick: (e: any, row: any) => {
            if (onRowClick) onRowClick(row.getData());
          }
        }}
      />
      <style jsx global>{`
        .tabulator-custom-wrapper {
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(245,158,11,0.05));
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .tabulator-custom-wrapper .tabulator {
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: none !important;
          border-radius: 19px;
          overflow: hidden;
          font-family: inherit;
        }
        .tabulator-custom-wrapper .tabulator-header {
          background: rgba(30, 41, 59, 0.4) !important;
          border-bottom: 1px solid rgba(6, 182, 212, 0.25) !important;
          color: #38bdf8;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }
        .tabulator-custom-wrapper .tabulator-row {
          background-color: transparent !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
          color: #f8fafc;
          transition: all 0.2s ease;
        }
        .tabulator-custom-wrapper .tabulator-row:hover {
          background-color: rgba(6, 182, 212, 0.08) !important;
          cursor: pointer;
          transform: scale(1.002);
        }
        .tabulator-custom-wrapper .tabulator-footer {
          background: rgba(15, 23, 42, 0.8) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #94a3b8;
        }
        .tabulator-custom-wrapper .tabulator-page {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-radius: 8px !important;
          margin: 0 4px !important;
          transition: all 0.2s;
        }
        .tabulator-custom-wrapper .tabulator-page.active {
          background: rgba(6, 182, 212, 0.2) !important;
          border-color: rgba(6, 182, 212, 0.5) !important;
          color: #22d3ee !important;
        }
        .tabulator-custom-wrapper .tabulator-page:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  );
}

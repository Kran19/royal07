'use client';

import { useEffect, useState } from 'react';
import {
  DataTable,
  FilterPanel,
  Button,
  Input,
  Select,
  Badge,
  Pagination,
  PageHeader,
  SectionCard,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { AuditLog, AuditAction, PaginatedResponse } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', adminId: '' });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await apiService.getAuditLogs(currentPage, 20, {
          action: filters.action as AuditAction | undefined,
          adminId: filters.adminId,
        });
        if (response.success && response.data) {
          setLogs(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [currentPage, filters]);

  const getActionColor = (action: AuditAction) => {
    if (action.includes('SUSPENDED') || action.includes('BANNED')) return 'danger';
    if (action.includes('ADJUSTED')) return 'warning';
    if (action.includes('CREATED') || action.includes('SETTLED')) return 'cyan';
    return 'default';
  };

  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Audit logs"
        description="Trace administrative actions with better table readability, safer filtering, and improved mobile behavior."
        actions={<Button variant="secondary">Export log</Button>}
      />

      <SectionCard title="Admin activity" description="Every important action captured in a production-ready review surface." noPadding>
        <div className="flex flex-col gap-4 border-b border-white/5 p-6 lg:flex-row">
          <div className="flex-1">
            <Input placeholder="Search by admin name or entity ID" />
          </div>
          <Button variant="secondary" onClick={() => setFilterOpen(true)}>
            Filters
          </Button>
        </div>

        <DataTable
          columns={[
            { key: 'adminName', label: 'Admin', sortable: true, width: '150px' },
            {
              key: 'action',
              label: 'Action',
              sortable: true,
              width: '200px',
              render: (value) => (
                <Badge variant={getActionColor(value as AuditAction)}>
                  {String(value).replace(/_/g, ' ')}
                </Badge>
              ),
            },
            { key: 'entityType', label: 'Entity type', width: '140px' },
            { key: 'entityId', label: 'Entity ID', width: '160px' },
            { key: 'description', label: 'Description', width: '340px' },
            {
              key: 'createdAt',
              label: 'Timestamp',
              width: '180px',
              render: (value) => new Date(value as Date).toLocaleString(),
            },
          ]}
          data={logs?.items || []}
          loading={loading}
        />

        {logs ? (
          <Pagination
            currentPage={logs.page}
            totalPages={logs.pages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        ) : null}
      </SectionCard>

      <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter audit logs">
        <div className="space-y-4">
          <Select
            label="Action"
            options={[
              { value: AuditAction.USER_CREATED, label: 'User created' },
              { value: AuditAction.USER_UPDATED, label: 'User updated' },
              { value: AuditAction.USER_SUSPENDED, label: 'User suspended' },
              { value: AuditAction.USER_BANNED, label: 'User banned' },
              { value: AuditAction.WALLET_ADJUSTED, label: 'Wallet adjusted' },
              { value: AuditAction.SETTINGS_UPDATED, label: 'Settings updated' },
            ]}
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          />
          <Input
            label="Admin ID"
            placeholder="Filter by admin ID"
            value={filters.adminId}
            onChange={(event) => setFilters((current) => ({ ...current, adminId: event.target.value }))}
          />
        </div>
      </FilterPanel>
    </>
  );
}

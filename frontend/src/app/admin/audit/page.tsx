'use client';

import { useEffect, useState } from 'react';
import {
  FilterPanel,
  Button,
  Input,
  Select,
  Badge,
  PageHeader,
  SectionCard,
  TabulatorTable,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { AuditLog, AuditAction } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ action: '', adminId: '' });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAuditLogs(1, 200, {
        action: filters.action,
        adminId: filters.adminId,
      });
      if (response.success && response.data) {
        const items = response.data.items || response.data;
        setLogs(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

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
        description="Trace administrative actions with full pagination and filtering."
        actions={<Button variant="secondary">Export log</Button>}
      />

      <SectionCard title="Admin activity" description="Every important action captured in a production-ready review surface." noPadding>
        <TabulatorTable
          columns={[
            { key: 'adminName', label: 'Admin', sortable: true, width: '150' },
            {
              key: 'action',
              label: 'Action',
              sortable: true,
              width: '200',
              render: (value: any) => (
                <Badge variant={getActionColor(value as AuditAction)}>
                  {String(value).replace(/_/g, ' ')}
                </Badge>
              ),
            },
            { key: 'entityType', label: 'Entity type', width: '140' },
            { key: 'entityId', label: 'Entity ID', width: '160' },
            { key: 'description', label: 'Description', width: '340' },
            {
              key: 'createdAt',
              label: 'Timestamp',
              width: '180',
              render: (value: any) => new Date(value as Date).toLocaleString(),
            },
          ]}
          data={logs}
          loading={loading}
          paginationSize={20}
          title="Audit_Logs"
        />
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

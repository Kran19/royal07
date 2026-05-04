'use client';

import { useEffect, useState } from 'react';
import {
  FilterPanel,
  DetailDrawer,
  Button,
  Select,
  Badge,
  StatusIndicator,
  PageHeader,
  SectionCard,
  TabulatorTable,
} from '@/components/admin/common';
import { apiService } from '@/lib/api/api-service';
import { User, UserStatus } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsers(1, 200, filters.search, filters.status as UserStatus | undefined);
      if (response.success && response.data) {
        setUsers(response.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleUserClick = async (user: User) => {
    try {
      const response = await apiService.getUserById(user.id);
      if (response.success && response.data) {
        setSelectedUser(response.data);
        setDetailOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleStatusChange = async (status: UserStatus) => {
    if (!selectedUser) return;
    try {
      const response = await apiService.updateUserStatus(selectedUser.id, status);
      if (response.success && response.data) {
        setSelectedUser(response.data);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="User management"
        description="Review accounts, balances, and status in the new production architecture."
      />

      <SectionCard
        title="Directory"
        description="Search the user base and open details for account actions."
        noPadding
      >
        <TabulatorTable
          columns={[
            {
              key: 'username',
              label: 'Username',
              sortable: true,
              width: '180',
              render: (value: any, row: User) => value || row.mobile || '-',
            },
            {
              key: 'email',
              label: 'Email',
              sortable: true,
              width: '260',
              render: (value: any) => value || '-',
            },
            {
              key: 'status',
              label: 'Status',
              width: '160',
              hozAlign: 'center',
              render: (value: any) => (
                <StatusIndicator
                  status={value === UserStatus.ACTIVE ? 'active' : 'inactive'}
                  label={String(value)}
                />
              ),
            },
            {
              key: 'balance',
              label: 'Balance',
              width: '140',
              hozAlign: 'right',
              sortable: true,
              render: (value: any) => `₹${Number(value).toLocaleString()}`,
            },
            {
              key: 'totalBets',
              label: 'Bets',
              width: '120',
              hozAlign: 'right',
              sortable: true,
              render: (value: any) => Number(value).toLocaleString(),
            },
            {
              key: 'isActive',
              label: 'Risk',
              width: '120',
              hozAlign: 'center',
              render: (value: any) =>
                value ? <Badge variant="default">Clear</Badge> : <Badge variant="danger">Inactive</Badge>,
            },
          ]}
          data={users}
          loading={loading}
          onRowClick={handleUserClick}
          paginationSize={20}
          title="Users_Directory"
        />
      </SectionCard>

      <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter users">
        <div className="space-y-4">
          <Select
            label="Status"
            options={[
              { value: UserStatus.ACTIVE, label: 'Active' },
              { value: UserStatus.BANNED, label: 'Banned' },
            ]}
            value={filters.status}
            onChange={(event) => {
              setFilters((current) => ({ ...current, status: event.target.value }));
            }}
          />
          <Button variant="secondary" className="w-full" onClick={() => setFilters({ search: '', status: '' })}>
            Clear filters
          </Button>
        </div>
      </FilterPanel>

      <DetailDrawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedUser ? `${selectedUser.username || selectedUser.mobile} details` : 'User details'}
        size="lg"
      >
        {selectedUser ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard label="Username" value={selectedUser.username || '-'} />
              <InfoCard label="Mobile" value={selectedUser.mobile || '-'} />
              <InfoCard label="Email" value={selectedUser.email || '-'} />
              <InfoCard label="Role" value={selectedUser.role || '-'} />
              <InfoCard label="Member since" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
            </div>

            <Section title="Wallet summary">
              <MetricRow label="Balance" value={`₹${selectedUser.balance.toLocaleString()}`} />
              <MetricRow label="Total bets" value={selectedUser.totalBets.toLocaleString()} />
              <MetricRow label="Wins" value={selectedUser.totalWon.toLocaleString()} />
              <MetricRow label="Deposits" value={`₹${selectedUser.totalDeposit.toLocaleString()}`} />
            </Section>

            <Section title="Account status">
              <div className="mb-4">
                <StatusIndicator
                  status={selectedUser.status === UserStatus.ACTIVE ? 'active' : 'inactive'}
                  label={selectedUser.status}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant={selectedUser.status === UserStatus.ACTIVE ? 'danger' : 'success'}
                  onClick={() =>
                    handleStatusChange(
                      selectedUser.status === UserStatus.ACTIVE ? UserStatus.BANNED : UserStatus.ACTIVE
                    )
                  }
                >
                  {selectedUser.status === UserStatus.ACTIVE ? 'Ban account' : 'Activate account'}
                </Button>
                {selectedUser.status !== UserStatus.BANNED ? (
                  <Button variant="danger" onClick={() => handleStatusChange(UserStatus.BANNED)}>
                    Ban user
                  </Button>
                ) : null}
              </div>
            </Section>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
      <h3 className="mb-5 text-lg font-bold tracking-tight text-white">{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3.5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}


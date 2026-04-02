'use client';

import { useState, useMemo } from 'react';
import { useActivityLogs, useAllUsers } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { ACTION_COLOR_CONFIG } from '@oceanus/shared';
import { Filter, ScrollText, X } from 'lucide-react';

const ENTITY_TYPES = [
  { value: '', label: 'All Entity Types' },
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'policy', label: 'Policy' },
  { value: 'endorsement', label: 'Endorsement' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'user', label: 'User' },
  { value: 'product', label: 'Product' },
  { value: 'insurer', label: 'Insurer' },
  { value: 'rate_table', label: 'Rate Table' },
  { value: 'modifier', label: 'Risk Modifier' },
  { value: 'inclusion', label: 'Coverage Inclusion' },
  { value: 'reference_data', label: 'Reference Data' },
];

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATED', label: 'Created' },
  { value: 'EDITED', label: 'Edited' },
  { value: 'STATUS_CHANGE', label: 'Status Change' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'DELETED', label: 'Deleted' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
];

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  ...ACTION_COLOR_CONFIG,
  RETURNED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: usersData } = useAllUsers();

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: '30' };
    if (filters.entityType) p.entityType = filters.entityType;
    if (filters.action) p.action = filters.action;
    if (filters.userId) p.userId = filters.userId;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    return p;
  }, [page, filters]);

  const { data, isLoading, error } = useActivityLogs(params);

  const userOptions = [
    { value: '', label: 'All Users' },
    ...(usersData || []).map((u: any) => ({ value: u.id, label: u.name })),
  ];

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ entityType: '', action: '', userId: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  if (isLoading) return <LoadingState message="Loading activity logs..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const activities = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Activity Logs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            System-wide audit trail of all actions
          </p>
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} className="mr-1" />
          Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select
              label="Entity Type"
              options={ENTITY_TYPES}
              value={filters.entityType}
              onChange={(e) => { setFilters({ ...filters, entityType: e.target.value }); setPage(1); }}
            />
            <Select
              label="Action"
              options={ACTIONS}
              value={filters.action}
              onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
            />
            <Select
              label="User"
              options={userOptions}
              value={filters.userId}
              onChange={(e) => { setFilters({ ...filters, userId: e.target.value }); setPage(1); }}
            />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date From</label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={filters.dateFrom}
                onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Date To</label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={filters.dateTo}
                onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
              />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={14} className="mr-1" /> Clear Filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {activities.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={32} />}
          title="No activity found"
          message="No activity logs match the current filters"
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Timestamp', 'User', 'Action', 'Entity Type', 'Detail'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a: any) => {
                  const ac = ACTION_COLORS[a.action] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {a.user?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: ac.color, background: ac.bg }}
                        >
                          {a.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        {a.entityType?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
                        {a.detail || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border-default)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {meta.total} total entries
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {meta.page} / {meta.totalPages}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

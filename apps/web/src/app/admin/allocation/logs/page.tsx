'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAllocationLogs } from '@/hooks/use-api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { AllocationMethod } from '@oceanus/shared';

export default function AdminAllocationLogsPage() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const { data, isLoading, error } = useAllocationLogs({
    page: String(page),
    ...(method ? { method } : {}),
  });

  if (isLoading) return <LoadingState message="Loading assignment logs..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r: any) => new Date(r.createdAt).toLocaleString() },
    {
      key: 'lead', header: 'Lead',
      render: (r: any) => <Link href={`/sales/leads/${r.lead?.id}`} className="text-blue-500 hover:underline">{r.lead?.ref || r.leadId}</Link>,
    },
    { key: 'assignedTo', header: 'Assigned To', render: (r: any) => r.assignedTo?.name || '-' },
    {
      key: 'method', header: 'Method',
      render: (r: any) => (
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: r.method === AllocationMethod.ROUND_ROBIN ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)', color: r.method === AllocationMethod.ROUND_ROBIN ? '#3b82f6' : '#6b7280' }}>
          {r.method === AllocationMethod.ROUND_ROBIN ? 'Round Robin' : 'Manual'}
        </span>
      ),
    },
    { key: 'pool', header: 'Pool', render: (r: any) => r.pool?.name || '-' },
    { key: 'assignedBy', header: 'Assigned By', render: (r: any) => r.assignedBy?.name || 'System' },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.reason || '-'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Assignment Logs</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{meta.total} total assignments</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All Methods' }, { value: AllocationMethod.ROUND_ROBIN, label: 'Round Robin' }, { value: AllocationMethod.MANUAL, label: 'Manual' }]}
            className="w-40" />
          <Link href="/admin/allocation"><Button size="sm" variant="secondary">Back to Pools</Button></Link>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
        <DataTable columns={columns} data={logs} emptyMessage="No assignment logs found" />
      </div>

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="py-2 px-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Page {page} of {meta.totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

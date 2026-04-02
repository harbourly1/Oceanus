'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUnassignedLeads, useRetryAllocation, useUsers, useAssignLead, useProductConfigMap } from '@/hooks/use-api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { getLeadTemperature } from '@oceanus/shared';
import { ProductIcon } from '@/lib/product-icons';

export default function AdminUnassignedQueuePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useUnassignedLeads({ page: String(page) });
  const { data: agents } = useUsers('SALES_EXEC');
  const retryAllocation = useRetryAllocation();
  const assignLead = useAssignLead();
  const productConfigMap = useProductConfigMap();
  const [assigning, setAssigning] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading unassigned leads..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const leads = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  async function handleRetry(leadId: string) {
    await retryAllocation.mutateAsync(leadId);
    refetch();
  }

  async function handleManualAssign(leadId: string, agentId: string) {
    await assignLead.mutateAsync({ id: leadId, assignedToId: agentId });
    setAssigning(null);
    refetch();
  }

  const columns = [
    {
      key: 'ref', header: 'Lead',
      render: (r: any) => <Link href={`/sales/leads/${r.id}`} className="text-blue-500 hover:underline font-medium">{r.ref}</Link>,
    },
    {
      key: 'productType', header: 'Product',
      render: (r: any) => {
        const config = productConfigMap[r.productType?.toUpperCase()];
        return <span className="text-sm flex items-center gap-1"><ProductIcon iconKey={config?.iconKey} size={14} /> {config?.label || r.productType}</span>;
      },
    },
    { key: 'fullName', header: 'Contact' },
    {
      key: 'score', header: 'Score',
      render: (r: any) => {
        const temp = getLeadTemperature(r.score);
        const colors: Record<string, string> = { hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6' };
        return <span className="text-sm font-medium" style={{ color: colors[temp] }}>{r.score} ({temp.toUpperCase()})</span>;
      },
    },
    { key: 'createdAt', header: 'Submitted', render: (r: any) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'actions', header: 'Actions',
      render: (r: any) => (
        <div className="flex gap-2 items-center">
          <Button size="sm" variant="secondary" onClick={() => handleRetry(r.id)} loading={retryAllocation.isPending}>Auto-Allocate</Button>
          {assigning === r.id ? (
            <Select value="" onChange={(e) => { if (e.target.value) handleManualAssign(r.id, e.target.value); }}
              options={[{ value: '', label: 'Select agent...' }, ...(agents || []).map((a: any) => ({ value: a.id, label: a.name }))]} className="w-40" />
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setAssigning(r.id)}>Assign</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Unassigned Leads</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{meta.total} leads awaiting assignment</p>
        </div>
        <Link href="/admin/allocation"><Button size="sm" variant="secondary">Back to Pools</Button></Link>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
        <DataTable columns={columns} data={leads} emptyMessage="All leads are assigned!" />
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

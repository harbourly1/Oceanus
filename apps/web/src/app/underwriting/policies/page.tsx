'use client';

import { useState } from 'react';
import { usePolicies } from '@/hooks/use-api';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_UW: { label: 'Pending UW', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ACTIVE: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function UwPoliciesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, error, refetch } = usePolicies({
    page: String(page), limit: '20', ...(statusFilter ? { status: statusFilter } : {}),
  });

  if (isLoading) return <LoadingState message="Loading policies..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const policies = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>All Policies</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>View all policies across the system</p>
      </div>

      <div className="flex gap-2">
        {['', 'PENDING_UW', 'ACTIVE', 'CANCELLED', 'EXPIRED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: statusFilter === s ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
              color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
            }}>
            {s ? STATUS_CONFIG[s]?.label || s : 'All'}
          </button>
        ))}
      </div>

      {policies.length === 0 ? (
        <EmptyState title="No policies" message="No policies match the current filter" />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Policy Ref', 'Policy #', 'Customer', 'Insurer', 'Product', 'Premium', 'Status', 'Issued By', 'Endorsements'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.ref}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.policyNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${p.customerId?.id}`} className="text-xs hover:underline"
                        style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                        {p.customerId?.customerName || '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.insurer}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.product}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {p.premium?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge {...(STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING_UW)} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.issuedBy?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p._count?.endorsements || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-xs disabled:opacity-30"
                  style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>Prev</button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded text-xs disabled:opacity-30"
                  style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>Next</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

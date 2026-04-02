'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/use-api';
import { Card, CardHeader, Badge, DataTable, LoadingState, ErrorState } from '@/components/ui';

const POLICY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_UW: { label: 'Pending UW', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ACTIVE: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  EXPIRED: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function SalesCustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useCustomers({ page: String(page), limit: '20', ...(search ? { search } : {}) } as any);

  if (isLoading) return <LoadingState message="Loading customers..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const customers = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>All Customer IDs created from leads</p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by customer name, ID, or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
        />
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                {['Customer ID', 'Customer Name', 'Email', 'Phone', 'Lead', 'Policies', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border-default)' }}
                  onClick={() => router.push(`/customers/${c.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>{c.ref}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.customerName}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.email || '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.lead?.ref || '-'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c._count?.policies || 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {meta.total} total &middot; Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded text-xs disabled:opacity-30"
                style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>
                Prev
              </button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded text-xs disabled:opacity-30"
                style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

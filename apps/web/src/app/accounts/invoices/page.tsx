'use client';

import { useState } from 'react';
import { useInvoices } from '@/hooks/use-api';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '@/components/ui';

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:            { label: 'Draft',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  PENDING_APPROVAL: { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:         { label: 'Approved', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  DECLINED:         { label: 'Declined', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  PAID:             { label: 'Paid',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  CANCELLED:        { label: 'Cancelled',color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, error, refetch } = useInvoices({
    page: String(page), limit: '20',
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  if (isLoading) return <LoadingState message="Loading invoices..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const invoices = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>All Invoices</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Complete invoice listing across all transactions</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2 items-center">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Type:</span>
          {['', 'NEW_POLICY', 'CANCELLATION', 'EXTENSION', 'NAME_CHANGE', 'ADDON'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: typeFilter === t ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
                color: typeFilter === t ? '#fff' : 'var(--color-text-secondary)',
              }}>
              {t ? t.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Status:</span>
          {['', 'PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'PAID'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: statusFilter === s ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
                color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
              }}>
              {s ? STATUS_COLORS[s]?.label || s : 'All'}
            </button>
          ))}
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices" message="No invoices match the current filters" />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Invoice #', 'Customer Name', 'Insurance Provider', 'Type', 'Total Premium', 'Payment Date', 'Payment Mode', 'Sales Agent', 'Status', 'Approved By', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-primary)' }}>
                      {inv.customerId?.customerName || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.policy?.insurer || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {inv.currency || 'AED'} {inv.total?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.paymentDate ? new Date(inv.paymentDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.paymentMode || '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.createdBy?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge {...(STATUS_COLORS[inv.status] || STATUS_COLORS.DRAFT)} />
                      {inv.status === 'DECLINED' && inv.remarks && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-accent-red)' }}>{inv.remarks}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.approvedBy?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
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

'use client';

import { useState } from 'react';
import { useApprovalQueue, useProcessQueueItem } from '@/hooks/use-api';
import { Card, CardHeader, Button, Badge, Modal, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

const QUEUE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  IN_REVIEW: { label: 'In Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  APPROVED: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export default function ApprovalQueuePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, error, refetch } = useApprovalQueue({
    page: String(page), limit: '20', ...(statusFilter ? { status: statusFilter } : {}),
  });
  const processItem = useProcessQueueItem();
  const [actionModal, setActionModal] = useState<{ id: string; action: string } | null>(null);
  const [remarks, setRemarks] = useState('');

  const handleProcess = async () => {
    if (!actionModal) return;
    try {
      await processItem.mutateAsync({ id: actionModal.id, action: actionModal.action, notes: remarks || undefined });
      setActionModal(null);
      setRemarks('');
      refetch();
    } catch { /* handled */ }
  };

  if (isLoading) return <LoadingState message="Loading approval queue..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const items = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Accounts Approval Queue</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Review and approve invoices for new policies and endorsements</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: statusFilter === s ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
              color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No items in queue" message="All caught up!" icon={<CheckCircle size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Invoice #', 'Customer', 'Type', 'Amount', 'Receipt Amt', 'Payment Mode', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const inv = item.invoice;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {inv?.invoiceNumber || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/customers/${inv?.customerId?.id}`} className="text-xs hover:underline"
                          style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                          {inv?.customerId?.customerName || '-'}
                        </Link>
                        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{inv?.customerId?.ref}</div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv?.type?.replace('_', ' ') || '-'}</td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        AED {inv?.total?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {inv?.receiptAmount ? `AED ${inv.receiptAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv?.paymentMode || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge {...(QUEUE_STATUS[item.status] || QUEUE_STATUS.PENDING)} />
                      </td>
                      <td className="px-4 py-3">
                        {(item.status === 'PENDING' || item.status === 'IN_REVIEW') && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="primary" onClick={() => setActionModal({ id: item.id, action: 'APPROVE' })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setActionModal({ id: item.id, action: 'REJECT' })}>
                              Decline
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Action Modal */}
      <Modal open={!!actionModal} onClose={() => { setActionModal(null); setRemarks(''); }}
        title={actionModal?.action === 'APPROVE' ? 'Approve Invoice' : 'Decline Invoice'}>
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {actionModal?.action === 'APPROVE'
              ? 'Confirm that the receipt matches the invoice amount. This will assign to an underwriter for policy creation.'
              : 'Provide remarks for declining this invoice. It will be returned to the sales executive.'}
          </p>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Remarks {actionModal?.action === 'REJECT' ? '(required)' : '(optional)'}
            </label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Enter remarks..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setActionModal(null); setRemarks(''); }}>Cancel</Button>
            <Button size="sm" variant={actionModal?.action === 'APPROVE' ? 'primary' : 'danger'}
              loading={processItem.isPending} onClick={handleProcess}
              disabled={actionModal?.action === 'REJECT' && !remarks}>
              {actionModal?.action === 'APPROVE' ? 'Approve' : 'Decline'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

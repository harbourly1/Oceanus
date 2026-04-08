'use client';

import { useState } from 'react';
import { useApprovalQueue, useProcessQueueItem } from '@/hooks/use-api';
import { Card, CardHeader, Button, Badge, Modal, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import Link from 'next/link';
import { CheckCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!actionModal) return;
    setActionError(null);
    try {
      await processItem.mutateAsync({ id: actionModal.id, action: actionModal.action, notes: remarks || undefined });
      setActionModal(null);
      setRemarks('');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Action failed';
      setActionError(msg);
      setActionModal(null);
      setRemarks('');
    }
  };

  const resolveDocUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${apiBase}${path}`;
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

      {/* Action error banner */}
      {actionError && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {actionError}
          <button className="ml-3 underline text-xs" onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No items in queue" message="All caught up!" icon={<CheckCircle size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['', 'Invoice #', 'Customer', 'Type', 'Amount', 'Receipt Amt', 'Payment Mode', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const inv = item.invoice;
                  const isExpanded = expandedId === item.id;
                  return (
                    <>
                      <tr key={item.id} className="cursor-pointer hover:opacity-80"
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border-default)' }}
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                        <td className="px-4 py-3 w-8">
                          {isExpanded
                            ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
                            : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {inv?.invoiceNumber || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/customers/${inv?.customerId?.id}`} className="text-xs hover:underline"
                            style={{ color: 'var(--color-accent-blue, #3b82f6)' }}
                            onClick={e => e.stopPropagation()}>
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
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                      {isExpanded && inv && (
                        <tr key={`${item.id}-detail`} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                          <td colSpan={9} className="px-6 py-4" style={{ background: 'var(--color-bg-hover)' }}>
                            <div className="space-y-4">
                              {/* Financial Details */}
                              <div>
                                <h4 className="text-[10px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Financial Details</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Base Amount</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {inv.amount?.toLocaleString() || '0'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>VAT (5%)</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {inv.vat?.toLocaleString() || '0'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>AED {inv.total?.toLocaleString() || '0'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Receipt Amount</span>
                                    <span className="text-xs font-medium" style={{
                                      color: inv.receiptAmount && inv.total && inv.receiptAmount !== inv.total
                                        ? 'var(--color-accent-red, #ef4444)' : 'var(--color-text-primary)',
                                    }}>
                                      {inv.receiptAmount ? `AED ${inv.receiptAmount.toLocaleString()}` : 'Not provided'}
                                      {inv.receiptAmount && inv.total && inv.receiptAmount !== inv.total && ' (mismatch)'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Payment Details */}
                              <div>
                                <h4 className="text-[10px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Payment Details</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Payment Mode</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.paymentMode || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Payment Date</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                      {inv.paymentDate ? new Date(inv.paymentDate).toLocaleDateString() : 'Not provided'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Due Date</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Purchase Type</span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.policyPurchaseType || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Installment */}
                              {inv.installment && (
                                <div>
                                  <h4 className="text-[10px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Installment</h4>
                                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                                      {inv.installmentDetails || 'Installment payment enabled (no details provided)'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Receipt Document */}
                              <div>
                                <h4 className="text-[10px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Receipt Document</h4>
                                {inv.receiptPath ? (
                                  <a href={resolveDocUrl(inv.receiptPath)!} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                                    style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue, #3b82f6)' }}>
                                    <FileText size={14} />
                                    View Receipt
                                  </a>
                                ) : (
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No receipt uploaded</span>
                                )}
                              </div>

                              {/* Notes */}
                              {inv.notes && (
                                <div>
                                  <h4 className="text-[10px] uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Notes</h4>
                                  <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}>
                                    {inv.notes}
                                  </p>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="flex gap-6 pt-1" style={{ borderTop: '1px solid var(--color-border-default)' }}>
                                <div>
                                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Created: </span>
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                    {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '-'}
                                  </span>
                                </div>
                                {inv.createdBy?.name && (
                                  <div>
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>By: </span>
                                    <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{inv.createdBy.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

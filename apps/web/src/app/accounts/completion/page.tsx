'use client';

import { useState, useMemo } from 'react';
import { useCompletionQueue, useProcessQueueItem } from '@/hooks/use-api';
import { Card, Button, Badge, Modal, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import Link from 'next/link';
import { FileText, CheckCircle, RotateCcw, XCircle } from 'lucide-react';

const QUEUE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  IN_REVIEW: { label: 'In Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  RETURNED: { label: 'Returned', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  REJECTED: { label: 'Declined', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function DocumentLink({ label, path }: { label: string; path?: string | null }) {
  if (!path) return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded text-xs"
      style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
      <FileText size={14} />
      <span>{label}</span>
      <span className="ml-auto italic text-[10px]">Not uploaded</span>
    </div>
  );

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:opacity-80 transition-opacity"
      style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue, #3b82f6)' }}>
      <FileText size={14} />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-[10px]">View &rarr;</span>
    </a>
  );
}

export default function CompletionQueuePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useCompletionQueue({ page: String(page), limit: '20' });
  const processItem = useProcessQueueItem();
  const [completionModal, setCompletionModal] = useState<string | null>(null);
  const [returnModal, setReturnModal] = useState<string | null>(null);
  const [declineModal, setDeclineModal] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [docsVerified, setDocsVerified] = useState(false);

  const items = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  // Resolve the selected item's endorsement data for the modal
  const selectedItem = useMemo(() => {
    const activeId = completionModal || returnModal || declineModal;
    if (!activeId) return null;
    return items.find((i: any) => i.id === activeId) || null;
  }, [completionModal, returnModal, declineModal, items]);

  const resetModals = () => {
    setCompletionModal(null);
    setReturnModal(null);
    setDeclineModal(null);
    setNotes('');
    setDocsVerified(false);
  };

  const handleComplete = async () => {
    if (!completionModal) return;
    try {
      await processItem.mutateAsync({ id: completionModal, action: 'COMPLETE', notes: notes || undefined });
      resetModals();
      refetch();
    } catch { /* handled */ }
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    try {
      await processItem.mutateAsync({ id: returnModal, action: 'RETURN', notes: notes || undefined });
      resetModals();
      refetch();
    } catch { /* handled */ }
  };

  const handleDecline = async () => {
    if (!declineModal) return;
    try {
      await processItem.mutateAsync({ id: declineModal, action: 'DECLINE', notes: notes || undefined });
      resetModals();
      refetch();
    } catch { /* handled */ }
  };

  if (isLoading) return <LoadingState message="Loading cancellation queue..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Cancellation Queue</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Review cancellation endorsements - verify refund and mark complete</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No items in cancellation queue" message="No cancellations awaiting review" icon={<CheckCircle size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Endorsement', 'Customer', 'Policy', 'Canc. Date', 'Credit Note', 'Debit Note', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const end = item.endorsement;
                  const isActionable = item.status === 'PENDING' || item.status === 'IN_REVIEW';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{end?.ref || '-'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/customers/${end?.customerId?.id}`} className="text-xs hover:underline"
                          style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                          {end?.customerId?.customerName || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{end?.policy?.ref || '-'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {end?.cancellationDate ? new Date(end.cancellationDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {end?.creditNoteNumber || '-'}
                        {end?.creditNoteAmount != null && <span className="ml-1">(AED {end.creditNoteAmount.toLocaleString()})</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {end?.debitNoteNumber || '-'}
                        {end?.debitNoteAmount != null && <span className="ml-1">(AED {end.debitNoteAmount.toLocaleString()})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge {...(QUEUE_STATUS[item.status] || QUEUE_STATUS.PENDING)} />
                      </td>
                      <td className="px-4 py-3">
                        {isActionable && (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => { setCompletionModal(item.id); setDocsVerified(false); }}>
                              Complete
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setReturnModal(item.id)}>
                              Return
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setDeclineModal(item.id)}>
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

      <Modal open={!!completionModal} onClose={resetModals} title="Review & Complete Cancellation" width="560px">
        <div className="space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Review all documents and verify the details before marking complete. The policy will be cancelled.
          </p>

          {/* Endorsement Summary */}
          {selectedItem?.endorsement && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Endorsement</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedItem.endorsement.ref}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Cancellation Date</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {selectedItem.endorsement.cancellationDate ? new Date(selectedItem.endorsement.cancellationDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Credit Note</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {selectedItem.endorsement.creditNoteNumber || '-'}
                  {selectedItem.endorsement.creditNoteAmount != null && ` (AED ${selectedItem.endorsement.creditNoteAmount.toLocaleString()})`}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Debit Note</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {selectedItem.endorsement.debitNoteNumber || '-'}
                  {selectedItem.endorsement.debitNoteAmount != null && ` (AED ${selectedItem.endorsement.debitNoteAmount.toLocaleString()})`}
                </span>
              </div>
            </div>
          )}

          {/* Document Review Section */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Documents to Review</label>
            <div className="space-y-1.5">
              <DocumentLink label="Endorsement Certificate" path={selectedItem?.endorsement?.endorsementCertificatePath} />
              <DocumentLink label="Credit Note" path={selectedItem?.endorsement?.creditNotePath} />
              <DocumentLink label="Debit Note" path={selectedItem?.endorsement?.debitNotePath} />
              <DocumentLink label="Cancellation Letter" path={selectedItem?.endorsement?.cancellationLetterPath} />
              <DocumentLink label="Refund Calculation" path={selectedItem?.endorsement?.refundCalculationPath} />
            </div>
          </div>

          {/* Verification Checkbox */}
          <label className="flex items-start gap-2 cursor-pointer p-2 rounded"
            style={{ background: docsVerified ? 'rgba(16,185,129,0.08)' : 'var(--color-bg-hover)' }}>
            <input type="checkbox" checked={docsVerified} onChange={e => setDocsVerified(e.target.checked)}
              className="mt-0.5" />
            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
              I have reviewed all documents and verified the cancellation details are correct
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes (optional)</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={resetModals}>Cancel</Button>
            <Button size="sm" loading={processItem.isPending} onClick={handleComplete} disabled={!docsVerified}>
              <CheckCircle size={14} className="mr-1" /> Mark Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return to UW Modal */}
      <Modal open={!!returnModal} onClose={resetModals} title="Return to Underwriter">
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Return this cancellation to the underwriter for corrections. They will be notified and can resubmit.
          </p>
          {selectedItem?.endorsement && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Endorsement</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedItem.endorsement.ref}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Policy</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedItem.endorsement.policy?.ref || '-'}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reason for Return *</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
              placeholder="Describe what needs to be corrected..."
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={resetModals}>Cancel</Button>
            <Button size="sm" variant="secondary" loading={processItem.isPending} onClick={handleReturn} disabled={!notes.trim()}>
              <RotateCcw size={14} className="mr-1" /> Return to UW
            </Button>
          </div>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal open={!!declineModal} onClose={resetModals} title="Decline Cancellation">
        <div className="space-y-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-accent-red)' }}>
              This will reject the cancellation. The policy will remain active.
            </p>
          </div>
          {selectedItem?.endorsement && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Endorsement</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedItem.endorsement.ref}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Policy</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{selectedItem.endorsement.policy?.ref || '-'}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reason for Decline *</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
              placeholder="Explain why the cancellation is being declined..."
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={resetModals}>Cancel</Button>
            <Button size="sm" variant="danger" loading={processItem.isPending} onClick={handleDecline} disabled={!notes.trim()}>
              <XCircle size={14} className="mr-1" /> Decline Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useUwQueue, useCompleteUwAssignment, useReturnUwAssignment, useUploadFile, useProductConfigMap } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { FormDataDisplay } from '@/components/ui/form-data-display';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

function parseJson(str: string | null | undefined) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function LeadDataSection({ lead, productConfigMap }: { lead: any; productConfigMap: Record<string, { label: string; iconKey: string }> }) {
  const [open, setOpen] = useState(false);
  if (!lead) return null;

  const formData = parseJson(lead.formData);
  const selectedQuote = parseJson(lead.selectedQuote);
  const productLabel = productConfigMap[lead.productType]?.label || lead.productType;

  return (
    <div className="mt-3 rounded-lg" style={{ border: '1px solid var(--color-border-default)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
        style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-secondary)', borderRadius: open ? '0.5rem 0.5rem 0 0' : '0.5rem' }}>
        <span>Submission Details (Lead {lead.ref})</span>
        <span>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3" style={{ background: 'var(--color-bg-secondary)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[['Name', lead.fullName], ['Email', lead.email], ['Phone', lead.phone], ['Company', lead.company], ['Product', productLabel], ['Currency', lead.currency]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string}>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{v}</p>
              </div>
            ))}
          </div>
          {formData && Object.keys(formData).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Form Data</h4>
              <FormDataDisplay productType={lead.productType} formData={formData} variant="compact" />
            </div>
          )}
          {selectedQuote && (
            <div className="p-2 rounded-lg" style={{ border: '2px solid var(--color-accent-green, #22c55e)', background: 'rgba(34,197,94,0.04)' }}>
              <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Selected Quote</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {selectedQuote.insurer && <div><span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>INSURER</span><p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedQuote.insurer}</p></div>}
                {selectedQuote.premium != null && <div><span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>PREMIUM</span><p className="text-sm font-bold" style={{ color: 'var(--color-accent-green, #22c55e)' }}>{lead.currency || 'AED'} {Number(selectedQuote.premium).toLocaleString()}</p></div>}
                {selectedQuote.rate != null && <div><span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>RATE</span><p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{(selectedQuote.rate * 100).toFixed(3)}%</p></div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileUploadField({ label, accept, onUpload, uploadedUrl, uploading }: {
  label: string; accept: string; onUpload: (file: File) => void;
  uploadedUrl: string | null; uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
        <Button size="sm" variant="secondary" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : uploadedUrl ? 'Replace' : 'Choose File'}
        </Button>
        {uploadedUrl && (
          <span className="text-xs" style={{ color: 'var(--color-accent-green, #22c55e)' }}>Uploaded</span>
        )}
      </div>
    </div>
  );
}

export default function UwInProgressPage() {
  const { data, isLoading, error, refetch } = useUwQueue({ status: 'IN_PROGRESS' });
  const completeAssignment = useCompleteUwAssignment();
  const returnAssignment = useReturnUwAssignment();
  const uploadFile = useUploadFile();
  const productConfigMap = useProductConfigMap();

  const [completeModal, setCompleteModal] = useState<any>(null);
  const [returnModal, setReturnModal] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  // Policy issuance form
  const [policyForm, setPolicyForm] = useState({
    policyNumber: '', policyHolderName: '', premiumCharged: '',
    startDate: '', endDate: '', sumInsured: '',
    debitNoteNumber: '', debitNoteAmount: '', creditNoteNumber: '', creditNoteAmount: '',
    notes: '',
  });

  // Policy document uploads
  const [policyDocs, setPolicyDocs] = useState({
    policyDocument: null as string | null,
    policySchedule: null as string | null,
    debitNotePath: null as string | null,
    creditNotePath: null as string | null,
  });
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Endorsement completion form
  const [endorsementForm, setEndorsementForm] = useState({
    creditNoteNumber: '', creditNoteAmount: '', effectiveDate: '', financialImpact: '', notes: '',
    debitNoteNumber: '', debitNoteAmount: '', cancellationDate: '',
  });

  // Endorsement document uploads
  const [endorsementDocs, setEndorsementDocs] = useState({
    creditNotePath: null as string | null,
    cancellationLetterPath: null as string | null,
    refundCalculationPath: null as string | null,
    revisedDocumentPath: null as string | null,
    endorsementCertificatePath: null as string | null,
    debitNotePath: null as string | null,
  });

  const handleDocUpload = async (field: string, file: File, isPolicy: boolean) => {
    setUploadingField(field);
    try {
      const result = await uploadFile.mutateAsync({ path: '/api/uploads/document', file });
      if (isPolicy) {
        setPolicyDocs(d => ({ ...d, [field]: result.url }));
      } else {
        setEndorsementDocs(d => ({ ...d, [field]: result.url }));
      }
    } catch { /* handled */ }
    setUploadingField(null);
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    const isPolicy = !!completeModal.policy;

    try {
      if (isPolicy) {
        await completeAssignment.mutateAsync({
          id: completeModal.id,
          policyNumber: policyForm.policyNumber || undefined,
          policyHolderName: policyForm.policyHolderName || undefined,
          premiumCharged: policyForm.premiumCharged ? parseFloat(policyForm.premiumCharged) : undefined,
          startDate: policyForm.startDate || undefined,
          endDate: policyForm.endDate || undefined,
          sumInsured: policyForm.sumInsured ? parseFloat(policyForm.sumInsured) : undefined,
          debitNoteNumber: policyForm.debitNoteNumber || undefined,
          debitNoteAmount: policyForm.debitNoteAmount ? parseFloat(policyForm.debitNoteAmount) : undefined,
          creditNoteNumber: policyForm.creditNoteNumber || undefined,
          creditNoteAmount: policyForm.creditNoteAmount ? parseFloat(policyForm.creditNoteAmount) : undefined,
          policyDocument: policyDocs.policyDocument || undefined,
          policySchedule: policyDocs.policySchedule || undefined,
          debitNotePath: policyDocs.debitNotePath || undefined,
          creditNotePath: policyDocs.creditNotePath || undefined,
          notes: policyForm.notes || undefined,
        });
      } else {
        await completeAssignment.mutateAsync({
          id: completeModal.id,
          creditNoteNumber: endorsementForm.creditNoteNumber || undefined,
          creditNoteAmount: endorsementForm.creditNoteAmount ? parseFloat(endorsementForm.creditNoteAmount) : undefined,
          effectiveDate: endorsementForm.effectiveDate || undefined,
          financialImpact: endorsementForm.financialImpact ? parseFloat(endorsementForm.financialImpact) : undefined,
          creditNotePath: endorsementDocs.creditNotePath || undefined,
          cancellationLetterPath: endorsementDocs.cancellationLetterPath || undefined,
          refundCalculationPath: endorsementDocs.refundCalculationPath || undefined,
          revisedDocumentPath: endorsementDocs.revisedDocumentPath || undefined,
          endorsementCertificatePath: endorsementDocs.endorsementCertificatePath || undefined,
          debitNotePath: endorsementDocs.debitNotePath || undefined,
          debitNoteNumber: endorsementForm.debitNoteNumber || undefined,
          debitNoteAmount: endorsementForm.debitNoteAmount ? parseFloat(endorsementForm.debitNoteAmount) : undefined,
          cancellationDate: endorsementForm.cancellationDate || undefined,
          notes: endorsementForm.notes || undefined,
        });
      }
      setCompleteModal(null);
      setPolicyForm({ policyNumber: '', policyHolderName: '', premiumCharged: '', startDate: '', endDate: '', sumInsured: '', debitNoteNumber: '', debitNoteAmount: '', creditNoteNumber: '', creditNoteAmount: '', notes: '' });
      setPolicyDocs({ policyDocument: null, policySchedule: null, debitNotePath: null, creditNotePath: null });
      setEndorsementForm({ creditNoteNumber: '', creditNoteAmount: '', effectiveDate: '', financialImpact: '', notes: '', debitNoteNumber: '', debitNoteAmount: '', cancellationDate: '' });
      setEndorsementDocs({ creditNotePath: null, cancellationLetterPath: null, refundCalculationPath: null, revisedDocumentPath: null, endorsementCertificatePath: null, debitNotePath: null });
      refetch();
    } catch { /* handled */ }
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    try {
      await returnAssignment.mutateAsync({ id: returnModal, notes: returnNotes || undefined });
      setReturnModal(null);
      setReturnNotes('');
      refetch();
    } catch { /* handled */ }
  };

  if (isLoading) return <LoadingState message="Loading in-progress assignments..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const items = data?.data || [];
  const isCancellation = (item: any) => item.endorsement?.type === 'CANCELLATION';
  const isExtensionOrAddon = (item: any) => ['EXTENSION', 'ADDON'].includes(item.endorsement?.type);
  const getEndorsementType = (item: any): string => item.endorsement?.type || '';

  const getEndorsementModalTitle = (item: any) => {
    const t = getEndorsementType(item);
    if (t === 'CANCELLATION') return 'Process Cancellation';
    if (t === 'EXTENSION') return 'Complete Extension';
    if (t === 'NAME_CHANGE') return 'Complete Name Change';
    if (t === 'ADDON') return 'Complete Add-on';
    return 'Complete Endorsement';
  };

  const getEndorsementButtonLabel = (item: any) => {
    const t = getEndorsementType(item);
    if (t === 'CANCELLATION') return 'Process Cancellation';
    if (t === 'EXTENSION') return 'Complete Extension';
    if (t === 'NAME_CHANGE') return 'Complete Name Change';
    if (t === 'ADDON') return 'Complete Add-on';
    return 'Complete Endorsement';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>In Progress</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Assignments currently being worked on</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing in progress" message="Start a review from the queue to begin" icon={<RefreshCw size={32} />} />
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => {
            const isPolicy = !!item.policy;
            const customerName = isPolicy ? item.policy?.customerId?.customerName : item.endorsement?.customerId?.customerName;
            const customerId = isPolicy ? item.policy?.customerId?.id : item.endorsement?.customerId?.id;
            const ref = isPolicy ? item.policy?.ref : item.endorsement?.ref;
            const lead = isPolicy ? item.policy?.customerId?.lead : item.endorsement?.customerId?.lead;

            return (
              <Card key={item.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        label={isPolicy ? 'Policy Issuance' : `${item.endorsement?.type || 'Endorsement'}`}
                        color={isPolicy ? '#3b82f6' : '#8b5cf6'}
                        bg={isPolicy ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)'}
                      />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{ref}</span>
                    </div>
                    <Link href={`/customers/${customerId}`} className="text-sm hover:underline"
                      style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                      {customerName}
                    </Link>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Assigned to: {item.underwriter?.name} &middot; Started: {item.startedAt ? new Date(item.startedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setReturnModal(item.id)}>Return</Button>
                    <Button size="sm" onClick={() => setCompleteModal(item)}>Complete</Button>
                  </div>
                </div>
                <LeadDataSection lead={lead} productConfigMap={productConfigMap} />
              </Card>
            );
          })}
        </div>
      )}

      {/* Complete Modal - Policy Issuance */}
      <Modal open={!!completeModal && !!completeModal?.policy} onClose={() => setCompleteModal(null)}
        title="Complete Policy Issuance" width="640px">
        <div className="space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Issue the policy at the insurer, upload documents, then fill in the details below.
          </p>

          {/* Document Uploads */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Document Uploads (PDF/Image)</h4>
            <div className="grid grid-cols-2 gap-3">
              <FileUploadField label="Policy Document *" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleDocUpload('policyDocument', f, true)}
                uploadedUrl={policyDocs.policyDocument} uploading={uploadingField === 'policyDocument'} />
              <FileUploadField label="Policy Schedule" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleDocUpload('policySchedule', f, true)}
                uploadedUrl={policyDocs.policySchedule} uploading={uploadingField === 'policySchedule'} />
              <FileUploadField label="Debit Note *" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleDocUpload('debitNotePath', f, true)}
                uploadedUrl={policyDocs.debitNotePath} uploading={uploadingField === 'debitNotePath'} />
              <FileUploadField label="Credit Note" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleDocUpload('creditNotePath', f, true)}
                uploadedUrl={policyDocs.creditNotePath} uploading={uploadingField === 'creditNotePath'} />
            </div>
          </div>

          {/* Policy Fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'policyNumber', label: 'Policy Number *', type: 'text' },
              { key: 'policyHolderName', label: 'Policy Holder Name *', type: 'text' },
              { key: 'premiumCharged', label: 'Premium Charged (AED) *', type: 'number' },
              { key: 'sumInsured', label: 'Sum Insured (AED) *', type: 'number' },
              { key: 'startDate', label: 'Policy Start Date *', type: 'date' },
              { key: 'endDate', label: 'Policy Expiry Date *', type: 'date' },
              { key: 'debitNoteNumber', label: 'Debit Note Number *', type: 'text' },
              { key: 'debitNoteAmount', label: 'Debit Note Amount (AED) *', type: 'number' },
              { key: 'creditNoteNumber', label: 'Credit Note Number', type: 'text' },
              { key: 'creditNoteAmount', label: 'Credit Note Amount (AED)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input type={f.type} className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={(policyForm as any)[f.key]}
                  onChange={e => setPolicyForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={2}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={policyForm.notes} onChange={e => setPolicyForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCompleteModal(null)}>Cancel</Button>
            <Button size="sm" loading={completeAssignment.isPending} onClick={handleComplete}>
              Issue Policy
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Modal - Endorsement */}
      <Modal open={!!completeModal && !!completeModal?.endorsement} onClose={() => setCompleteModal(null)}
        title={getEndorsementModalTitle(completeModal || {})} width="640px">
        <div className="space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {isCancellation(completeModal || {})
              ? 'Process the cancellation at the insurer, upload required documents, then fill in the details.'
              : 'Process the endorsement at the insurer, upload revised documents, then fill in the details.'}
          </p>

          {/* Document Uploads */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Document Uploads (PDF/Image)</h4>
            <div className="grid grid-cols-2 gap-3">
              <FileUploadField label="Credit Note *" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleDocUpload('creditNotePath', f, false)}
                uploadedUrl={endorsementDocs.creditNotePath} uploading={uploadingField === 'creditNotePath'} />
              {isCancellation(completeModal || {}) ? (
                <>
                  <FileUploadField label="Endorsement Certificate *" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('endorsementCertificatePath', f, false)}
                    uploadedUrl={endorsementDocs.endorsementCertificatePath} uploading={uploadingField === 'endorsementCertificatePath'} />
                  <FileUploadField label="Cancellation Letter *" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('cancellationLetterPath', f, false)}
                    uploadedUrl={endorsementDocs.cancellationLetterPath} uploading={uploadingField === 'cancellationLetterPath'} />
                  <FileUploadField label="Debit Note" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('debitNotePath', f, false)}
                    uploadedUrl={endorsementDocs.debitNotePath} uploading={uploadingField === 'debitNotePath'} />
                  <FileUploadField label="Refund Calculation" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('refundCalculationPath', f, false)}
                    uploadedUrl={endorsementDocs.refundCalculationPath} uploading={uploadingField === 'refundCalculationPath'} />
                </>
              ) : (
                <>
                  <FileUploadField label="Revised Document *" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('revisedDocumentPath', f, false)}
                    uploadedUrl={endorsementDocs.revisedDocumentPath} uploading={uploadingField === 'revisedDocumentPath'} />
                  <FileUploadField label="Endorsement Certificate" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleDocUpload('endorsementCertificatePath', f, false)}
                    uploadedUrl={endorsementDocs.endorsementCertificatePath} uploading={uploadingField === 'endorsementCertificatePath'} />
                  {isExtensionOrAddon(completeModal || {}) && (
                    <FileUploadField label="Debit Note" accept=".pdf,.jpg,.jpeg,.png"
                      onUpload={(f) => handleDocUpload('debitNotePath', f, false)}
                      uploadedUrl={endorsementDocs.debitNotePath} uploading={uploadingField === 'debitNotePath'} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Endorsement Fields */}
          <div className="grid grid-cols-2 gap-3">
            {isCancellation(completeModal || {}) && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Cancellation Date *</label>
                <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={endorsementForm.cancellationDate} onChange={e => setEndorsementForm(f => ({ ...f, cancellationDate: e.target.value }))} />
              </div>
            )}
            {(isCancellation(completeModal || {}) || isExtensionOrAddon(completeModal || {})) && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Debit Note Number</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    value={endorsementForm.debitNoteNumber} onChange={e => setEndorsementForm(f => ({ ...f, debitNoteNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Debit Note Amount (AED)</label>
                  <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    value={endorsementForm.debitNoteAmount} onChange={e => setEndorsementForm(f => ({ ...f, debitNoteAmount: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Credit Note Number *</label>
              <input type="text" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementForm.creditNoteNumber} onChange={e => setEndorsementForm(f => ({ ...f, creditNoteNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Credit Note Amount (AED) *</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementForm.creditNoteAmount} onChange={e => setEndorsementForm(f => ({ ...f, creditNoteAmount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Effective Date *</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementForm.effectiveDate} onChange={e => setEndorsementForm(f => ({ ...f, effectiveDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Financial Impact (AED)</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementForm.financialImpact} onChange={e => setEndorsementForm(f => ({ ...f, financialImpact: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={2}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={endorsementForm.notes} onChange={e => setEndorsementForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCompleteModal(null)}>Cancel</Button>
            <Button size="sm" loading={completeAssignment.isPending} onClick={handleComplete}>
              {getEndorsementButtonLabel(completeModal || {})}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnModal} onClose={() => { setReturnModal(null); setReturnNotes(''); }} title="Return Assignment">
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Return this assignment for revision.</p>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setReturnModal(null); setReturnNotes(''); }}>Cancel</Button>
            <Button size="sm" variant="danger" loading={returnAssignment.isPending} onClick={handleReturn}>Return</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

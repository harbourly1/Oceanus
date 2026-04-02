'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useCustomerDetail, useCreateEndorsement, useCreateInvoice, useUpdatePolicy, useUpdateEndorsement, useUploadFile, useUpdateCustomer,
} from '@/hooks/use-api';
import { useCurrentUser } from '@/hooks/use-auth';
import { Card, CardHeader, Button, Badge, Tabs, Modal, LoadingState, ErrorState } from '@/components/ui';
import { POLICY_STATUS_CONFIG, ENDORSEMENT_STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '@oceanus/shared';
import { ClipboardList, FileEdit, Receipt, ChevronDown, ChevronRight, FileText, Pencil } from 'lucide-react';

function InfoRow({ label, value, link }: { label: string; value: string | null | undefined; link?: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5" style={{ borderBottom: '1px solid var(--color-border-default)' }}>
      <span className="text-xs w-36 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {link ? (
        <Link href={link} className="text-sm font-medium hover:underline" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
          {value || '-'}
        </Link>
      ) : (
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{value || '-'}</span>
      )}
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string | null }) {
  if (!url) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resolvedUrl = url.startsWith('http') ? url : `${apiBase}${url}`;
  return (
    <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:opacity-80 transition-opacity"
      style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue, #3b82f6)' }}>
      <FileText size={12} />
      <span className="font-medium">{label}</span>
    </a>
  );
}

function EndorsementDocLink({ label, path }: { label: string; path?: string | null }) {
  if (!path) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:opacity-80 transition-opacity"
      style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--color-accent-blue, #3b82f6)' }}>
      <FileText size={12} />
      <span className="font-medium">{label}</span>
    </a>
  );
}

function formatDateForInput(d: string | null | undefined) {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
}

function FileUploadField({ label, accept, onUpload, uploadedUrl, uploading, currentUrl }: {
  label: string; accept: string; onUpload: (file: File) => void;
  uploadedUrl: string | null; uploading: boolean; currentUrl?: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const resolvedCurrent = currentUrl ? (currentUrl.startsWith('http') ? currentUrl : `${apiBase}${currentUrl}`) : null;
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
        <Button size="sm" variant="secondary" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : uploadedUrl ? 'Replace' : currentUrl ? 'Replace' : 'Choose File'}
        </Button>
        {uploadedUrl && <span className="text-xs" style={{ color: 'var(--color-accent-green, #22c55e)' }}>New file uploaded</span>}
        {!uploadedUrl && resolvedCurrent && (
          <a href={resolvedCurrent} target="_blank" rel="noopener noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>View current</a>
        )}
      </div>
    </div>
  );
}

function EndorsementRow({ endorsement: e, canEdit, onEdit }: { endorsement: any; canEdit?: boolean; onEdit?: (e: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCancellation = e.type === 'CANCELLATION';
  const hasDocs = e.creditNotePath || e.cancellationLetterPath || e.endorsementCertificatePath ||
    e.debitNotePath || e.refundCalculationPath || e.revisedDocumentPath;
  const hasDetails = e.creditNoteNumber || e.debitNoteNumber || e.cancellationDate ||
    e.creditNoteAmount != null || e.debitNoteAmount != null;
  const isExpandable = hasDocs || hasDetails || e.reason;
  const isEditLocked = isCancellation && e.status === 'COMPLETED';

  const statusCfg = (ENDORSEMENT_STATUS_CONFIG as any)[e.status] || ENDORSEMENT_STATUS_CONFIG.DRAFT;

  return (
    <div style={{ borderBottom: '1px solid var(--color-border-default)' }}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:opacity-80"
        onClick={() => isExpandable && setExpanded(!expanded)}>
        {isExpandable ? (
          expanded ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} /> :
            <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
        ) : <span className="w-3.5" />}
        <span className="text-xs font-medium w-24" style={{ color: 'var(--color-text-primary)' }}>{e.ref}</span>
        <span className="text-xs w-24" style={{ color: 'var(--color-text-secondary)' }}>{e.type?.replace('_', ' ')}</span>
        <Badge label={statusCfg.label} color={statusCfg.color} bg={statusCfg.bg} />
        <span className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>
          {e.effectiveDate ? new Date(e.effectiveDate).toLocaleDateString() : '-'}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {e.requestedBy?.name || '-'}
        </span>
        {canEdit && !isEditLocked && onEdit && (
          <button onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-accent-blue, #3b82f6)' }} title="Edit endorsement">
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-10 pb-3 space-y-3">
          {/* Basic details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {e.requestedBy?.name && (
              <div>
                <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Requested By</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.requestedBy.name}</span>
              </div>
            )}
            {e.effectiveDate && (
              <div>
                <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Effective Date</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{new Date(e.effectiveDate).toLocaleDateString()}</span>
              </div>
            )}
            {e.completedAt && (
              <div>
                <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Completed</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{new Date(e.completedAt).toLocaleDateString()}</span>
              </div>
            )}
            {e.cancellationDate && (
              <div>
                <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Cancellation Date</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-accent-red)' }}>{new Date(e.cancellationDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Financial details */}
          {hasDetails && (
            <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-hover)' }}>
              <span className="block text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Financial Details</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {e.creditNoteNumber && (
                  <div>
                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Credit Note #</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.creditNoteNumber}</span>
                  </div>
                )}
                {e.creditNoteAmount != null && (
                  <div>
                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Credit Note Amt</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {Number(e.creditNoteAmount).toLocaleString()}</span>
                  </div>
                )}
                {e.debitNoteNumber && (
                  <div>
                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Debit Note #</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.debitNoteNumber}</span>
                  </div>
                )}
                {e.debitNoteAmount != null && (
                  <div>
                    <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Debit Note Amt</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {Number(e.debitNoteAmount).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {hasDocs && (
            <div>
              <span className="block text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Documents</span>
              <div className="flex flex-wrap gap-2">
                <EndorsementDocLink label="Endorsement Certificate" path={e.endorsementCertificatePath} />
                <EndorsementDocLink label="Credit Note" path={e.creditNotePath} />
                <EndorsementDocLink label="Debit Note" path={e.debitNotePath} />
                <EndorsementDocLink label="Cancellation Letter" path={e.cancellationLetterPath} />
                <EndorsementDocLink label="Refund Calculation" path={e.refundCalculationPath} />
                <EndorsementDocLink label="Revised Document" path={e.revisedDocumentPath} />
              </div>
            </div>
          )}

          {/* Reason */}
          {e.reason && (
            <div>
              <span className="block text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Reason</span>
              <p className="text-xs rounded-lg p-2.5" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>{e.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer, isLoading, error, refetch } = useCustomerDetail(id);
  const createEndorsement = useCreateEndorsement();
  const createInvoice = useCreateInvoice();
  const updatePolicy = useUpdatePolicy();
  const updateEndorsement = useUpdateEndorsement();
  const updateCustomer = useUpdateCustomer();
  const uploadFile = useUploadFile();
  const user = useCurrentUser();

  const canEdit = !!user && ['UNDERWRITER', 'UW_MANAGER', 'ADMIN'].includes(user.role);
  const canEditCustomer = !!user && ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'].includes(user.role);

  const [activeTab, setActiveTab] = useState('overview');
  const [editCustomerModal, setEditCustomerModal] = useState(false);
  const [customerEditForm, setCustomerEditForm] = useState({
    customerName: '', email: '', phone: '', company: '',
    nationality: '', residence: '', contactPref: 'Email', currency: 'AED', language: 'en',
  });
  const [endorsementModal, setEndorsementModal] = useState<string | null>(null);
  const [invoiceModal, setInvoiceModal] = useState(false);

  // Endorsement form state
  const [endorsementForm, setEndorsementForm] = useState({
    reason: '', effectiveDate: '', details: '', financialImpact: '',
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    amount: '', receiptAmount: '', paymentDate: '', paymentMode: 'Online',
    installment: false, installmentDetails: '', notes: '', policyPurchaseType: 'ANNUAL',
  });

  // Edit Policy state
  const [editPolicyModal, setEditPolicyModal] = useState(false);
  const [policyEditForm, setPolicyEditForm] = useState({
    policyNumber: '', policyHolderName: '', premiumCharged: '', sumInsured: '',
    startDate: '', endDate: '', debitNoteNumber: '', debitNoteAmount: '',
    creditNoteNumber: '', creditNoteAmount: '',
  });
  const [policyEditDocs, setPolicyEditDocs] = useState<Record<string, string | null>>({
    policyDocument: null, policySchedule: null, debitNotePath: null, creditNotePath: null,
  });
  const [editUploadingField, setEditUploadingField] = useState<string | null>(null);

  // Edit Endorsement state
  const [editEndorsement, setEditEndorsement] = useState<any>(null);
  const [endorsementEditForm, setEndorsementEditForm] = useState({
    creditNoteNumber: '', creditNoteAmount: '', effectiveDate: '', financialImpact: '',
    debitNoteNumber: '', debitNoteAmount: '', cancellationDate: '',
  });
  const [endorsementEditDocs, setEndorsementEditDocs] = useState<Record<string, string | null>>({
    creditNotePath: null, cancellationLetterPath: null, refundCalculationPath: null,
    revisedDocumentPath: null, endorsementCertificatePath: null, debitNotePath: null,
  });

  if (isLoading) return <LoadingState message="Loading customer details..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;
  if (!customer) return <ErrorState message="Customer not found" />;

  const activePolicy = customer.policies?.find((p: any) => p.status === 'ACTIVE');
  const latestPolicy = customer.policies?.[0];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <ClipboardList size={14} /> },
    { id: 'endorsements', label: 'Endorsements', icon: <FileEdit size={14} />, count: customer.endorsements?.length || 0 },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={14} />, count: customer.invoices?.length || 0 },
  ];

  const openEditCustomer = () => {
    if (!customer) return;
    setCustomerEditForm({
      customerName: customer.customerName || '', email: customer.email || '',
      phone: customer.phone || '', company: customer.company || '',
      nationality: customer.nationality || '', residence: customer.residence || '',
      contactPref: customer.contactPref || 'Email', currency: customer.currency || 'AED',
      language: customer.language || 'en',
    });
    setEditCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    try {
      await updateCustomer.mutateAsync({ id: customer.id, ...customerEditForm });
      setEditCustomerModal(false);
      refetch();
    } catch (e: any) {
      alert(e?.message || 'Failed to update customer');
    }
  };

  const handleCreateEndorsement = async () => {
    if (!activePolicy || !endorsementModal) return;
    try {
      await createEndorsement.mutateAsync({
        policyId: activePolicy.id,
        type: endorsementModal,
        reason: endorsementForm.reason || undefined,
        effectiveDate: endorsementForm.effectiveDate || undefined,
        details: endorsementForm.details || undefined,
        financialImpact: endorsementForm.financialImpact ? parseFloat(endorsementForm.financialImpact) : undefined,
      });
      setEndorsementModal(null);
      setEndorsementForm({ reason: '', effectiveDate: '', details: '', financialImpact: '' });
      refetch();
    } catch (e) { /* mutation error handled by react-query */ }
  };

  const handleCreateInvoice = async () => {
    if (!latestPolicy) return;
    try {
      await createInvoice.mutateAsync({
        customerIdId: customer.id,
        policyId: latestPolicy.id,
        type: 'NEW_POLICY',
        amount: parseFloat(invoiceForm.amount),
        receiptAmount: invoiceForm.receiptAmount ? parseFloat(invoiceForm.receiptAmount) : undefined,
        paymentDate: invoiceForm.paymentDate || undefined,
        paymentMode: invoiceForm.paymentMode,
        installment: invoiceForm.installment,
        installmentDetails: invoiceForm.installmentDetails || undefined,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        policyPurchaseType: invoiceForm.policyPurchaseType || undefined,
        notes: invoiceForm.notes || undefined,
      });
      setInvoiceModal(false);
      setInvoiceForm({ amount: '', receiptAmount: '', paymentDate: '', paymentMode: 'Online', installment: false, installmentDetails: '', notes: '', policyPurchaseType: 'ANNUAL' });
      refetch();
    } catch (e) { /* mutation error handled by react-query */ }
  };

  const handleEditDocUpload = async (field: string, file: File, isPolicy: boolean) => {
    setEditUploadingField(field);
    try {
      const result = await uploadFile.mutateAsync({ path: '/api/uploads/document', file });
      if (isPolicy) {
        setPolicyEditDocs(d => ({ ...d, [field]: result.url }));
      } else {
        setEndorsementEditDocs(d => ({ ...d, [field]: result.url }));
      }
    } catch { /* handled */ }
    setEditUploadingField(null);
  };

  const openEditPolicy = () => {
    if (!latestPolicy) return;
    setPolicyEditForm({
      policyNumber: latestPolicy.policyNumber || '',
      policyHolderName: latestPolicy.policyHolderName || '',
      premiumCharged: latestPolicy.premiumCharged?.toString() || '',
      sumInsured: latestPolicy.sumInsured?.toString() || '',
      startDate: formatDateForInput(latestPolicy.startDate),
      endDate: formatDateForInput(latestPolicy.endDate),
      debitNoteNumber: latestPolicy.debitNoteNumber || '',
      debitNoteAmount: latestPolicy.debitNoteAmount?.toString() || '',
      creditNoteNumber: latestPolicy.creditNoteNumber || '',
      creditNoteAmount: latestPolicy.creditNoteAmount?.toString() || '',
    });
    setPolicyEditDocs({ policyDocument: null, policySchedule: null, debitNotePath: null, creditNotePath: null });
    setEditPolicyModal(true);
  };

  const handleSavePolicy = async () => {
    if (!latestPolicy) return;
    const payload: { id: string } & Record<string, any> = { id: latestPolicy.id };
    if (policyEditForm.policyNumber) payload.policyNumber = policyEditForm.policyNumber;
    if (policyEditForm.policyHolderName) payload.policyHolderName = policyEditForm.policyHolderName;
    if (policyEditForm.premiumCharged) payload.premiumCharged = parseFloat(policyEditForm.premiumCharged);
    if (policyEditForm.sumInsured) payload.sumInsured = parseFloat(policyEditForm.sumInsured);
    if (policyEditForm.startDate) payload.startDate = policyEditForm.startDate;
    if (policyEditForm.endDate) payload.endDate = policyEditForm.endDate;
    if (policyEditForm.debitNoteNumber) payload.debitNoteNumber = policyEditForm.debitNoteNumber;
    if (policyEditForm.debitNoteAmount) payload.debitNoteAmount = parseFloat(policyEditForm.debitNoteAmount);
    if (policyEditForm.creditNoteNumber) payload.creditNoteNumber = policyEditForm.creditNoteNumber;
    if (policyEditForm.creditNoteAmount) payload.creditNoteAmount = parseFloat(policyEditForm.creditNoteAmount);
    // Include new doc uploads
    if (policyEditDocs.policyDocument) payload.policyDocument = policyEditDocs.policyDocument;
    if (policyEditDocs.policySchedule) payload.policySchedule = policyEditDocs.policySchedule;
    if (policyEditDocs.debitNotePath) payload.debitNotePath = policyEditDocs.debitNotePath;
    if (policyEditDocs.creditNotePath) payload.creditNotePath = policyEditDocs.creditNotePath;
    try {
      await updatePolicy.mutateAsync(payload);
      setEditPolicyModal(false);
      refetch();
    } catch { /* handled */ }
  };

  const openEditEndorsement = (e: any) => {
    setEndorsementEditForm({
      creditNoteNumber: e.creditNoteNumber || '',
      creditNoteAmount: e.creditNoteAmount?.toString() || '',
      effectiveDate: formatDateForInput(e.effectiveDate),
      financialImpact: e.financialImpact?.toString() || '',
      debitNoteNumber: e.debitNoteNumber || '',
      debitNoteAmount: e.debitNoteAmount?.toString() || '',
      cancellationDate: formatDateForInput(e.cancellationDate),
    });
    setEndorsementEditDocs({ creditNotePath: null, cancellationLetterPath: null, refundCalculationPath: null, revisedDocumentPath: null, endorsementCertificatePath: null, debitNotePath: null });
    setEditEndorsement(e);
  };

  const handleSaveEndorsement = async () => {
    if (!editEndorsement) return;
    const payload: { id: string } & Record<string, any> = { id: editEndorsement.id };
    if (endorsementEditForm.creditNoteNumber) payload.creditNoteNumber = endorsementEditForm.creditNoteNumber;
    if (endorsementEditForm.creditNoteAmount) payload.creditNoteAmount = parseFloat(endorsementEditForm.creditNoteAmount);
    if (endorsementEditForm.effectiveDate) payload.effectiveDate = endorsementEditForm.effectiveDate;
    if (endorsementEditForm.financialImpact) payload.financialImpact = parseFloat(endorsementEditForm.financialImpact);
    if (endorsementEditForm.debitNoteNumber) payload.debitNoteNumber = endorsementEditForm.debitNoteNumber;
    if (endorsementEditForm.debitNoteAmount) payload.debitNoteAmount = parseFloat(endorsementEditForm.debitNoteAmount);
    if (endorsementEditForm.cancellationDate) payload.cancellationDate = endorsementEditForm.cancellationDate;
    // Include new doc uploads
    for (const [key, val] of Object.entries(endorsementEditDocs)) {
      if (val) payload[key] = val;
    }
    try {
      await updateEndorsement.mutateAsync(payload);
      setEditEndorsement(null);
      refetch();
    } catch { /* handled */ }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-xs mb-2 hover:underline"
            style={{ color: 'var(--color-text-muted)' }}>
            &larr; Back
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {customer.ref}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {customer.customerName}
          </p>
        </div>

        {/* Action Buttons (Sales only, if policy Active) */}
        {activePolicy && (
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={() => setEndorsementModal('CANCELLATION')}>
              Cancellation
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEndorsementModal('EXTENSION')}>
              Extension
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEndorsementModal('NAME_CHANGE')}>
              Name Change
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEndorsementModal('ADDON')}>
              Addon
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader title="Customer Information" action={
              canEditCustomer ? (
                <button onClick={openEditCustomer}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-accent-blue, #3b82f6)', background: 'rgba(59,130,246,0.08)' }}>
                  <Pencil size={12} /> Edit
                </button>
              ) : undefined
            } />
            <InfoRow label="Customer ID" value={customer.ref} />
            <InfoRow label="Lead ID" value={customer.lead?.ref} link={`/sales/leads/${customer.lead?.id}`} />
            <InfoRow label="Name" value={customer.customerName} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Company" value={customer.company} />
            <InfoRow label="Nationality" value={customer.nationality} />
            <InfoRow label="Created" value={customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'} />
            <InfoRow label="Created By" value={customer.createdBy?.name} />
          </Card>

          {/* Original Policy */}
          {latestPolicy ? (
            <Card>
              <CardHeader title="Original Policy" action={
                <div className="flex items-center gap-2">
                  <Badge {...((POLICY_STATUS_CONFIG as any)[latestPolicy.status] || POLICY_STATUS_CONFIG.PENDING_UW)} />
                  {canEdit && (
                    <button onClick={openEditPolicy}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-accent-blue, #3b82f6)', background: 'rgba(59,130,246,0.08)' }}>
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>
              } />
              <InfoRow label="Policy ID" value={latestPolicy.ref} />
              <InfoRow label="Policy Number" value={latestPolicy.policyNumber} />
              <InfoRow label="Insurer" value={latestPolicy.insurer} />
              <InfoRow label="Product" value={latestPolicy.product} />
              <InfoRow label="Sum Insured" value={latestPolicy.sumInsured ? `AED ${latestPolicy.sumInsured.toLocaleString()}` : '-'} />
              <InfoRow label="Premium" value={latestPolicy.premium ? `AED ${latestPolicy.premium.toLocaleString()}` : '-'} />
              <InfoRow label="Premium Charged" value={latestPolicy.premiumCharged ? `AED ${latestPolicy.premiumCharged.toLocaleString()}` : '-'} />
              <InfoRow label="Start Date" value={latestPolicy.startDate ? new Date(latestPolicy.startDate).toLocaleDateString() : '-'} />
              <InfoRow label="Expiry Date" value={latestPolicy.endDate ? new Date(latestPolicy.endDate).toLocaleDateString() : '-'} />
              <InfoRow label="Policy Holder" value={latestPolicy.policyHolderName} />
              <InfoRow label="Issued By" value={latestPolicy.issuedBy?.name} />
              <InfoRow label="Debit Note #" value={latestPolicy.debitNoteNumber} />
              <InfoRow label="Debit Note Amt" value={latestPolicy.debitNoteAmount ? `AED ${latestPolicy.debitNoteAmount.toLocaleString()}` : '-'} />
              <InfoRow label="Credit Note #" value={latestPolicy.creditNoteNumber} />
              <InfoRow label="Credit Note Amt" value={latestPolicy.creditNoteAmount ? `AED ${latestPolicy.creditNoteAmount.toLocaleString()}` : '-'} />

              {/* Documents */}
              <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-border-default)' }}>
                <span className="text-xs w-full mb-1" style={{ color: 'var(--color-text-muted)' }}>Documents</span>
                <DocLink label="Policy Document" url={latestPolicy.policyDocument} />
                <DocLink label="Policy Schedule" url={latestPolicy.policySchedule} />
                <DocLink label="Debit Note" url={latestPolicy.debitNotePath} />
                <DocLink label="Credit Note" url={latestPolicy.creditNotePath} />
                {!latestPolicy.policyDocument && !latestPolicy.policySchedule && !latestPolicy.debitNotePath && !latestPolicy.creditNotePath && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No documents uploaded yet</span>
                )}
              </div>

              {/* Create Invoice button */}
              {latestPolicy.status === 'PENDING_UW' && customer.invoices?.length === 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
                  <Button size="sm" onClick={() => setInvoiceModal(true)}>Create Invoice</Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardHeader title="Policy" />
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No policy created yet</p>
            </Card>
          )}
        </div>
      )}

      {/* Endorsements Tab */}
      {activeTab === 'endorsements' && (
        <Card>
          <CardHeader title="Endorsement History" subtitle={`${customer.endorsements?.length || 0} endorsements`} />
          {customer.endorsements?.length > 0 ? (
            <div className="space-y-0">
              {customer.endorsements.map((e: any) => (
                <EndorsementRow key={e.id} endorsement={e} canEdit={canEdit} onEdit={openEditEndorsement} />
              ))}
            </div>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No endorsements yet</p>
          )}
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader title="Invoice History" subtitle={`${customer.invoices?.length || 0} invoices`}
            action={activePolicy && <Button size="sm" onClick={() => setInvoiceModal(true)}>New Invoice</Button>}
          />
          {customer.invoices?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    {['Invoice #', 'Type', 'Amount', 'Receipt Amt', 'Payment Mode', 'Status', 'Created'].map(h => (
                      <th key={h} className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.invoiceNumber}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.type.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AED {inv.total?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {inv.receiptAmount ? `AED ${inv.receiptAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{inv.paymentMode || '-'}</td>
                      <td className="px-3 py-2">
                        <Badge {...((INVOICE_STATUS_CONFIG as any)[inv.status] || INVOICE_STATUS_CONFIG.DRAFT)} />
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No invoices yet</p>
          )}
        </Card>
      )}

      {/* Endorsement Creation Modal */}
      <Modal open={!!endorsementModal} onClose={() => setEndorsementModal(null)}
        title={`New ${endorsementModal?.replace('_', ' ')} Endorsement`} width="520px">
        <div className="space-y-4">
          {endorsementModal === 'CANCELLATION' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Reason</label>
              <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementForm.reason} onChange={e => setEndorsementForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for cancellation..." />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Requested Effective Date</label>
            <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={endorsementForm.effectiveDate} onChange={e => setEndorsementForm(f => ({ ...f, effectiveDate: e.target.value }))} />
          </div>
          {endorsementModal !== 'CANCELLATION' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Details</label>
                <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={3}
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={endorsementForm.details} onChange={e => setEndorsementForm(f => ({ ...f, details: e.target.value }))}
                  placeholder="Endorsement details..." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Additional Premium (AED)</label>
                <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={endorsementForm.financialImpact} onChange={e => setEndorsementForm(f => ({ ...f, financialImpact: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEndorsementModal(null)}>Cancel</Button>
            <Button size="sm" loading={createEndorsement.isPending} onClick={handleCreateEndorsement}>
              {endorsementModal === 'CANCELLATION' ? 'Submit Request' : 'Create Endorsement'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Creation Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="Create Invoice" width="520px">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Total Policy Premium (AED)</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={invoiceForm.amount} onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Receipt Amount (AED)</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={invoiceForm.receiptAmount} onChange={e => setInvoiceForm(f => ({ ...f, receiptAmount: e.target.value }))}
              placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Payment Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={invoiceForm.paymentDate} onChange={e => setInvoiceForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Payment Mode</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={invoiceForm.paymentMode} onChange={e => setInvoiceForm(f => ({ ...f, paymentMode: e.target.value }))}>
                <option value="Online">Online</option>
                <option value="Direct">Direct</option>
                <option value="COD">COD</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Policy Purchase Type</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={invoiceForm.policyPurchaseType} onChange={e => setInvoiceForm(f => ({ ...f, policyPurchaseType: e.target.value }))}>
              <option value="ANNUAL">Annual</option>
              <option value="TEMPORARY">Temporary</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="installment" checked={invoiceForm.installment}
              onChange={e => setInvoiceForm(f => ({ ...f, installment: e.target.checked }))} />
            <label htmlFor="installment" className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Installment Payment</label>
          </div>
          {invoiceForm.installment && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Installment Details</label>
              <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={2}
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={invoiceForm.installmentDetails} onChange={e => setInvoiceForm(f => ({ ...f, installmentDetails: e.target.value }))}
                placeholder="e.g., 3 monthly installments..." />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm" rows={2}
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setInvoiceModal(false)}>Cancel</Button>
            <Button size="sm" loading={createInvoice.isPending} onClick={handleCreateInvoice}
              disabled={!invoiceForm.amount}>
              Create Invoice
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Policy Modal */}
      <Modal open={editPolicyModal} onClose={() => setEditPolicyModal(false)} title="Edit Policy Details" width="640px">
        <div className="space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Documents (PDF/Image)</h4>
            <div className="grid grid-cols-2 gap-3">
              <FileUploadField label="Policy Document" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleEditDocUpload('policyDocument', f, true)}
                uploadedUrl={policyEditDocs.policyDocument} uploading={editUploadingField === 'policyDocument'}
                currentUrl={latestPolicy?.policyDocument} />
              <FileUploadField label="Policy Schedule" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleEditDocUpload('policySchedule', f, true)}
                uploadedUrl={policyEditDocs.policySchedule} uploading={editUploadingField === 'policySchedule'}
                currentUrl={latestPolicy?.policySchedule} />
              <FileUploadField label="Debit Note" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleEditDocUpload('debitNotePath', f, true)}
                uploadedUrl={policyEditDocs.debitNotePath} uploading={editUploadingField === 'debitNotePath'}
                currentUrl={latestPolicy?.debitNotePath} />
              <FileUploadField label="Credit Note" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleEditDocUpload('creditNotePath', f, true)}
                uploadedUrl={policyEditDocs.creditNotePath} uploading={editUploadingField === 'creditNotePath'}
                currentUrl={latestPolicy?.creditNotePath} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'policyNumber', label: 'Policy Number', type: 'text' },
              { key: 'policyHolderName', label: 'Policy Holder Name', type: 'text' },
              { key: 'premiumCharged', label: 'Premium Charged (AED)', type: 'number' },
              { key: 'sumInsured', label: 'Sum Insured (AED)', type: 'number' },
              { key: 'startDate', label: 'Policy Start Date', type: 'date' },
              { key: 'endDate', label: 'Policy Expiry Date', type: 'date' },
              { key: 'debitNoteNumber', label: 'Debit Note Number', type: 'text' },
              { key: 'debitNoteAmount', label: 'Debit Note Amount (AED)', type: 'number' },
              { key: 'creditNoteNumber', label: 'Credit Note Number', type: 'text' },
              { key: 'creditNoteAmount', label: 'Credit Note Amount (AED)', type: 'number' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input type={f.type} className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={(policyEditForm as any)[f.key]}
                  onChange={ev => setPolicyEditForm(p => ({ ...p, [f.key]: ev.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditPolicyModal(false)}>Cancel</Button>
            <Button size="sm" loading={updatePolicy.isPending} onClick={handleSavePolicy}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Endorsement Modal */}
      <Modal open={!!editEndorsement} onClose={() => setEditEndorsement(null)}
        title={`Edit ${editEndorsement?.type?.replace('_', ' ') || ''} Endorsement`} width="560px">
        <div className="space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-default)' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Documents (PDF/Image)</h4>
            <div className="grid grid-cols-2 gap-3">
              <FileUploadField label="Credit Note" accept=".pdf,.jpg,.jpeg,.png"
                onUpload={(f) => handleEditDocUpload('creditNotePath', f, false)}
                uploadedUrl={endorsementEditDocs.creditNotePath} uploading={editUploadingField === 'creditNotePath'}
                currentUrl={editEndorsement?.creditNotePath} />
              {editEndorsement?.type === 'CANCELLATION' ? (
                <>
                  <FileUploadField label="Endorsement Certificate" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleEditDocUpload('endorsementCertificatePath', f, false)}
                    uploadedUrl={endorsementEditDocs.endorsementCertificatePath} uploading={editUploadingField === 'endorsementCertificatePath'}
                    currentUrl={editEndorsement?.endorsementCertificatePath} />
                  <FileUploadField label="Cancellation Letter" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleEditDocUpload('cancellationLetterPath', f, false)}
                    uploadedUrl={endorsementEditDocs.cancellationLetterPath} uploading={editUploadingField === 'cancellationLetterPath'}
                    currentUrl={editEndorsement?.cancellationLetterPath} />
                  <FileUploadField label="Debit Note" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleEditDocUpload('debitNotePath', f, false)}
                    uploadedUrl={endorsementEditDocs.debitNotePath} uploading={editUploadingField === 'debitNotePath'}
                    currentUrl={editEndorsement?.debitNotePath} />
                  <FileUploadField label="Refund Calculation" accept=".pdf,.jpg,.jpeg,.png"
                    onUpload={(f) => handleEditDocUpload('refundCalculationPath', f, false)}
                    uploadedUrl={endorsementEditDocs.refundCalculationPath} uploading={editUploadingField === 'refundCalculationPath'}
                    currentUrl={editEndorsement?.refundCalculationPath} />
                </>
              ) : (
                <FileUploadField label="Revised Document" accept=".pdf,.jpg,.jpeg,.png"
                  onUpload={(f) => handleEditDocUpload('revisedDocumentPath', f, false)}
                  uploadedUrl={endorsementEditDocs.revisedDocumentPath} uploading={editUploadingField === 'revisedDocumentPath'}
                  currentUrl={editEndorsement?.revisedDocumentPath} />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {editEndorsement?.type === 'CANCELLATION' && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Cancellation Date</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    value={endorsementEditForm.cancellationDate} onChange={ev => setEndorsementEditForm(f => ({ ...f, cancellationDate: ev.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Debit Note Number</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    value={endorsementEditForm.debitNoteNumber} onChange={ev => setEndorsementEditForm(f => ({ ...f, debitNoteNumber: ev.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Debit Note Amount (AED)</label>
                  <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    value={endorsementEditForm.debitNoteAmount} onChange={ev => setEndorsementEditForm(f => ({ ...f, debitNoteAmount: ev.target.value }))} />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Credit Note Number</label>
              <input type="text" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementEditForm.creditNoteNumber} onChange={ev => setEndorsementEditForm(f => ({ ...f, creditNoteNumber: ev.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Credit Note Amount (AED)</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementEditForm.creditNoteAmount} onChange={ev => setEndorsementEditForm(f => ({ ...f, creditNoteAmount: ev.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Effective Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementEditForm.effectiveDate} onChange={ev => setEndorsementEditForm(f => ({ ...f, effectiveDate: ev.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Financial Impact (AED)</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={endorsementEditForm.financialImpact} onChange={ev => setEndorsementEditForm(f => ({ ...f, financialImpact: ev.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditEndorsement(null)}>Cancel</Button>
            <Button size="sm" loading={updateEndorsement.isPending} onClick={handleSaveEndorsement}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal open={editCustomerModal} onClose={() => setEditCustomerModal(false)} title="Edit Customer Details" width="540px">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'customerName', label: 'Customer Name *', type: 'text' },
              { key: 'email', label: 'Email *', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'text' },
              { key: 'company', label: 'Company', type: 'text' },
              { key: 'nationality', label: 'Nationality', type: 'text' },
              { key: 'residence', label: 'Residence', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input type={f.type} className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={(customerEditForm as any)[f.key]}
                  onChange={ev => setCustomerEditForm(prev => ({ ...prev, [f.key]: ev.target.value }))} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Contact Pref</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={customerEditForm.contactPref}
                onChange={ev => setCustomerEditForm(prev => ({ ...prev, contactPref: ev.target.value }))}>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Currency</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={customerEditForm.currency}
                onChange={ev => setCustomerEditForm(prev => ({ ...prev, currency: ev.target.value }))}>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Language</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={customerEditForm.language}
                onChange={ev => setCustomerEditForm(prev => ({ ...prev, language: ev.target.value }))}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditCustomerModal(false)}>Cancel</Button>
            <Button size="sm" loading={updateCustomer.isPending} onClick={handleSaveCustomer}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

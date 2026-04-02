'use client';

import { useState } from 'react';
import { useProductionReport, useUsers, useUnderwriters } from '@/hooks/use-api';
import { useToken } from '@/hooks/use-auth';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  PENDING_APPROVAL: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED: { label: 'Approved', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  DECLINED: { label: 'Declined', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  PAID: { label: 'Paid', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

const TRANSACTION_TYPES = ['NEW_POLICY', 'CANCELLATION', 'EXTENSION', 'NAME_CHANGE', 'ADDON'];
const INVOICE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DECLINED', 'PAID'];

export default function AccountsReportsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [salesExecFilter, setSalesExecFilter] = useState('');
  const [uwFilter, setUwFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Build query params
  const queryParams: Record<string, string> = { page: String(page), limit: '50' };
  if (typeFilter) queryParams.type = typeFilter;
  if (statusFilter) queryParams.status = statusFilter;
  if (insurerFilter) queryParams.insurer = insurerFilter;
  if (salesExecFilter) queryParams.salesExecutiveId = salesExecFilter;
  if (uwFilter) queryParams.underwriterId = uwFilter;
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;

  const { data, isLoading, error, refetch } = useProductionReport(queryParams);
  const token = useToken();

  // Fetch sales execs and underwriters for dropdowns
  const { data: salesUsers } = useUsers('SALES_EXEC');
  const { data: uwUsers } = useUnderwriters();

  const salesExecs = salesUsers?.data || salesUsers || [];
  const underwriters = uwUsers?.data || uwUsers || [];

  const resetFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setInsurerFilter('');
    setSalesExecFilter('');
    setUwFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = typeFilter || statusFilter || insurerFilter || salesExecFilter || uwFilter || dateFrom || dateTo;

  const handleExportCsv = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const exportParams = new URLSearchParams();
    if (typeFilter) exportParams.set('type', typeFilter);
    if (statusFilter) exportParams.set('status', statusFilter);
    if (insurerFilter) exportParams.set('insurer', insurerFilter);
    if (salesExecFilter) exportParams.set('salesExecutiveId', salesExecFilter);
    if (uwFilter) exportParams.set('underwriterId', uwFilter);
    if (dateFrom) exportParams.set('dateFrom', dateFrom);
    if (dateTo) exportParams.set('dateTo', dateTo);
    try {
      const res = await fetch(`${apiBase}/reports/production/export?${exportParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (isLoading) return <LoadingState message="Loading production report..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Accountant Production Report</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Filtered report: Customer ID, Name, Insurer, Sales, UW, Receipt Amount, Debit/Credit Notes, Status
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleExportCsv}>
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Filters</span>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                Clear All
              </button>
            )}
          </div>

          {/* Row 1: Transaction Type chips */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[10px] w-24 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Transaction Type</span>
            {['', ...TRANSACTION_TYPES].map(t => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                className="px-2 py-1 rounded text-xs"
                style={{
                  background: typeFilter === t ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
                  color: typeFilter === t ? '#fff' : 'var(--color-text-secondary)',
                }}>
                {t ? t.replace(/_/g, ' ') : 'All'}
              </button>
            ))}
          </div>

          {/* Row 2: Status chips */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[10px] w-24 shrink-0" style={{ color: 'var(--color-text-muted)' }}>Invoice Status</span>
            {['', ...INVOICE_STATUSES].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className="px-2 py-1 rounded text-xs"
                style={{
                  background: statusFilter === s ? 'var(--color-accent-blue, #3b82f6)' : 'var(--color-bg-hover)',
                  color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
                }}>
                {s ? s.replace(/_/g, ' ') : 'All'}
              </button>
            ))}
          </div>

          {/* Row 3: Date range, Insurer, Sales Exec, UW dropdowns */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Date From</span>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Date To</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Insurer</span>
              <input type="text" placeholder="Filter by insurer..." value={insurerFilter}
                onChange={e => { setInsurerFilter(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded border w-40"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Sales Executive</span>
              <select value={salesExecFilter} onChange={e => { setSalesExecFilter(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                <option value="">All</option>
                {Array.isArray(salesExecs) && salesExecs.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Underwriter</span>
              <select value={uwFilter} onChange={e => { setUwFilter(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                <option value="">All</option>
                {Array.isArray(underwriters) && underwriters.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No data" message="No records match the current filters" />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Customer ID', 'Customer Name', 'Insurer', 'Sales Exec', 'Underwriter', 'Receipt Amt', 'Debit Note Amt', 'Credit Note Amt', 'Policy Status', 'Type', 'Invoice Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>{r.customerId}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>{r.customerName}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.insurerName || '-'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.salesExecutive || '-'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.underwriter || '-'}</td>
                    <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {r.receiptAmount != null ? `AED ${r.receiptAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {r.debitNoteAmount != null ? `AED ${r.debitNoteAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {r.creditNoteAmount != null ? `AED ${r.creditNoteAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.policyStatus || '-'}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{r.transactionType?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">
                      <Badge {...(STATUS_COLORS[r.status] || STATUS_COLORS.DRAFT)} />
                    </td>
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

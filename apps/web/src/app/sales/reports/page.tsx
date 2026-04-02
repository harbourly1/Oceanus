'use client';

import React, { useState, useMemo } from 'react';
import { useMasterReport } from '@/hooks/use-api';
import { useToken } from '@/hooks/use-auth';
import { Card, Button, Badge, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { POLICY_STATUS_CONFIG, ENDORSEMENT_STATUS_CONFIG } from '@oceanus/shared';
import { TrendingUp, Download, Filter, X, ChevronRight, ChevronDown } from 'lucide-react';

function InputField({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      <input type={type} className="w-full px-2.5 py-1.5 rounded text-xs"
        style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      <select className="w-full px-2.5 py-1.5 rounded text-xs"
        style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
        value={value} onChange={e => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function MasterReportPage() {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    product: '', status: '', insurer: '', dateFrom: '', dateTo: '',
  });

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: '50' };
    if (filters.product) p.product = filters.product;
    if (filters.status) p.status = filters.status;
    if (filters.insurer) p.insurer = filters.insurer;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    return p;
  }, [page, filters]);

  const { data, isLoading, error, refetch } = useMasterReport(params);
  const token = useToken();
  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  const handleExportCsv = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const exportParams = new URLSearchParams();
    if (filters.product) exportParams.set('product', filters.product);
    if (filters.status) exportParams.set('status', filters.status);
    if (filters.insurer) exportParams.set('insurer', filters.insurer);
    if (filters.dateFrom) exportParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) exportParams.set('dateTo', filters.dateTo);
    try {
      const res = await fetch(`${apiBase}/reports/master/export?${exportParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const clearFilters = () => {
    setFilters({ product: '', status: '', insurer: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const endorsementTypeColor: Record<string, { color: string; bg: string }> = {
    CANCELLATION: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    EXTENSION: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    NAME_CHANGE: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    ADDON: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };

  if (isLoading) return <LoadingState message="Loading master report..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Master Report</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            All policies with endorsements, invoices, and cancellation details
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportCsv}>
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} className="mr-1" /> Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v).length})`}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SelectField label="Product" value={filters.product} onChange={v => { setFilters(f => ({ ...f, product: v })); setPage(1); }}
              options={[
                { value: 'MOTOR', label: 'Motor' }, { value: 'HEALTH', label: 'Health' },
                { value: 'PROPERTY', label: 'Property' }, { value: 'LIFE', label: 'Life' },
                { value: 'TRAVEL', label: 'Travel' }, { value: 'MARINE', label: 'Marine' },
              ]} />
            <SelectField label="Policy Status" value={filters.status} onChange={v => { setFilters(f => ({ ...f, status: v })); setPage(1); }}
              options={[
                { value: 'ACTIVE', label: 'Active' }, { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'EXPIRED', label: 'Expired' }, { value: 'PENDING_UW', label: 'Pending UW' },
              ]} />
            <InputField label="Insurer" value={filters.insurer} onChange={v => { setFilters(f => ({ ...f, insurer: v })); setPage(1); }} placeholder="Filter by insurer..." />
            <InputField label="From Date" type="date" value={filters.dateFrom} onChange={v => { setFilters(f => ({ ...f, dateFrom: v })); setPage(1); }} />
            <InputField label="To Date" type="date" value={filters.dateTo} onChange={v => { setFilters(f => ({ ...f, dateTo: v })); setPage(1); }} />
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={clearFilters}>
                <X size={12} className="mr-1" /> Clear Filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Report Table */}
      {rows.length === 0 ? (
        <EmptyState title="No data" message="No policies match your filters" icon={<TrendingUp size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: '1400px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Customer', 'Policy Ref', 'Policy #', 'Insurer', 'Product', 'Premium', 'Net Position',
                    'Endorsements', 'Status', 'Canc. Date', 'Canc. Credit Note', 'Canc. Debit Note', 'Sales Exec', 'UW'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => {
                  const statusCfg = (POLICY_STATUS_CONFIG as any)[row.status];
                  const endorsements = row.endorsements || [];
                  const isExpanded = expandedRows.has(idx);
                  return (
                    <React.Fragment key={idx}>
                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-border-default)' }}>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.customerName || '-'}</div>
                        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{row.customerId}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.policyId}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.policyNumber || '-'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.insurer || '-'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.product}</td>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        AED {Number(row.originalPremium || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-accent-green, #22c55e)' }}>
                        AED {Number(row.netPosition || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        {endorsements.length === 0 ? (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
                        ) : (
                          <button onClick={() => toggleRow(idx)} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: 'none', cursor: 'pointer' }}>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {endorsements.length}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {statusCfg ? <Badge {...statusCfg} /> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.status}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: row.cancellationDate ? 'var(--color-accent-red)' : 'var(--color-text-muted)' }}>
                        {row.cancellationDate ? new Date(row.cancellationDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {row.cancCreditNoteNumber || '-'}
                        {row.cancCreditNoteAmount != null && <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>AED {row.cancCreditNoteAmount.toLocaleString()}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {row.cancDebitNoteNumber || '-'}
                        {row.cancDebitNoteAmount != null && <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>AED {row.cancDebitNoteAmount.toLocaleString()}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.salesExecutive || '-'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.underwriter || '-'}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={14} className="px-6 py-3" style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-default)' }}>
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                            Endorsement Details
                          </div>
                          <table className="w-full">
                            <thead>
                              <tr>
                                {['Ref', 'Type', 'Status', 'Date', 'Financial Impact'].map(h => (
                                  <th key={h} className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-left"
                                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {endorsements.map((e: any, eIdx: number) => {
                                const typeCfg = endorsementTypeColor[e.type] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
                                const statusCfgE = (ENDORSEMENT_STATUS_CONFIG as any)[e.status];
                                return (
                                  <tr key={eIdx}>
                                    <td className="px-2 py-1.5 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.ref}</td>
                                    <td className="px-2 py-1.5">
                                      <Badge label={e.type.replace('_', ' ')} color={typeCfg.color} bg={typeCfg.bg} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {statusCfgE ? <Badge {...statusCfgE} /> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{e.status}</span>}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                      {e.date ? new Date(e.date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs font-medium" style={{ color: e.impact != null ? (e.impact >= 0 ? 'var(--color-accent-green, #22c55e)' : 'var(--color-accent-red, #ef4444)') : 'var(--color-text-muted)' }}>
                                      {e.impact != null ? `AED ${e.impact >= 0 ? '+' : ''}${Number(e.impact).toLocaleString()}` : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total policies</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-xs disabled:opacity-30"
                  style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>Prev</button>
                <span className="text-xs py-1" style={{ color: 'var(--color-text-muted)' }}>{page} / {meta.totalPages}</span>
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

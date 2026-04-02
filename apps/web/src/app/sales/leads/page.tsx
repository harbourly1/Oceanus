'use client';

import { useMemo, useState } from 'react';
import { useLeads, useCreateLead, useProductConfigMap, useLeadTasksList, useLeadTaskStats, useDashboard } from '@/hooks/use-api';
import { useCurrentUser } from '@/hooks/use-auth';
import { DataTable } from '@/components/ui/data-table';
import { WideStatusBadge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG } from '@oceanus/shared';
import { useRouter } from 'next/navigation';

const CAN_CREATE_ROLES = ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'];
const CREATE_SOURCE_OPTIONS = [
  { value: '', label: 'Select source...' },
  ...Object.entries(LEAD_SOURCE_CONFIG as Record<string, { label: string }>).map(([k, v]) => ({ value: k, label: v.label })),
];
const CURRENCY_OPTIONS = [
  { value: '', label: 'Select currency...' },
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];
const CONTACT_PREF_OPTIONS = [
  { value: '', label: 'Select preference...' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const INITIAL_FORM = {
  productType: '',
  fullName: '',
  email: '',
  phone: '',
  company: '',
  currency: '',
  source: '',
  contactPref: '',
};

const TIME_TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'older30', label: 'Older > 30 days' },
  { key: 'tomorrow', label: 'Tomorrow' },
] as const;

const PER_PAGE_OPTIONS = [
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export default function LeadsTasksPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // Filter state
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('20');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');

  const productConfigMap = useProductConfigMap();
  const createLead = useCreateLead();
  const canCreate = user && CAN_CREATE_ROLES.includes(user.role);
  const isSalesExec = user?.role === 'SALES_EXEC';

  // Build task list params
  const taskListParams: Record<string, string> = {
    page: String(page),
    limit,
    scope: isSalesExec ? 'mine' : scope,
    timePeriod,
  };
  if (search) taskListParams.search = search;
  if (dueDateFrom) taskListParams.dueDateFrom = dueDateFrom;
  if (dueDateTo) taskListParams.dueDateTo = dueDateTo;

  // Also fetch normal leads when there are no tasks yet (fallback)
  const leadQueryParams: Record<string, string> = { page: String(page), limit, search };
  if (isSalesExec) leadQueryParams.assignedToId = user?.id || '';

  const tasksList = useLeadTasksList(taskListParams);
  const taskStats = useLeadTaskStats({ scope: isSalesExec ? 'mine' : scope });
  const leadsFallback = useLeads(leadQueryParams);
  const { data: dashData } = useDashboard();

  // Determine which data to show
  const hasTaskData = tasksList.data?.data && tasksList.data.data.length > 0;
  const showTasksView = hasTaskData || timePeriod !== 'all' || dueDateFrom || dueDateTo;

  const tasksData = tasksList.data?.data || [];
  const tasksMeta = tasksList.data?.meta;
  const leadsData = leadsFallback.data?.data || [];
  const leadsMeta = leadsFallback.data?.meta;

  const displayData = showTasksView ? tasksData : leadsData;
  const displayMeta = showTasksView ? tasksMeta : leadsMeta;
  const isLoading = showTasksView ? tasksList.isLoading : leadsFallback.isLoading;
  const error = showTasksView ? tasksList.error : leadsFallback.error;

  const stats = taskStats.data || { all: 0, today: 0, yesterday: 0, last30: 0, older30: 0, tomorrow: 0 };

  const CREATE_PRODUCT_OPTIONS = useMemo(() =>
    [{ value: '', label: 'Select product...' }, ...Object.entries(productConfigMap).map(([k, v]) => ({ value: k, label: v.label }))], [productConfigMap]);

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const handleCreateSubmit = () => {
    if (!form.productType) { setFormError('Product type is required'); return; }
    if (!form.fullName.trim()) { setFormError('Full name is required'); return; }
    if (!form.email.trim()) { setFormError('Email is required'); return; }
    if (!form.source) { setFormError('Lead source is required'); return; }

    const payload: Record<string, any> = {
      productType: form.productType,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      source: form.source,
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.company.trim()) payload.company = form.company.trim();
    if (form.currency) payload.currency = form.currency;
    if (form.contactPref) payload.contactPref = form.contactPref;

    createLead.mutate(payload as any, {
      onSuccess: () => { setShowCreate(false); setForm(INITIAL_FORM); setFormError(''); },
      onError: (err: any) => { setFormError(err?.message || 'Failed to create lead'); },
    });
  };

  const handleCloseModal = () => {
    setShowCreate(false); setForm(INITIAL_FORM); setFormError(''); createLead.reset();
  };

  const handleReset = () => {
    setSearch(''); setPage(1); setDueDateFrom(''); setDueDateTo('');
    setTimePeriod('all'); setSelectedRows(new Set());
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Columns for the tasks view (lead + task data merged)
  const taskColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: any) => (
        <span className="text-sm font-medium">{row.fullName}</span>
      ),
    },
    {
      key: 'emailMobile',
      header: 'Email / Mobile',
      render: (row: any) => (
        <div>
          <div className="text-xs">{row.email}</div>
          {row.phone && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'userType',
      header: 'User Type',
      width: '200px',
      render: (row: any) => {
        const cfg = (LEAD_STATUS_CONFIG as any)[row.status];
        if (!cfg) return row.status;
        return <WideStatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
      },
    },
    {
      key: 'isRenewal',
      header: 'Is Renewal',
      render: (row: any) => (
        <span className="text-xs" style={{ color: row.hasCustomers ? 'var(--color-accent-green)' : 'var(--color-text-muted)' }}>
          {row.hasCustomers ? 'Renewal' : 'No'}
        </span>
      ),
    },
    {
      key: 'taskCount',
      header: 'Task #',
      render: (row: any) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {row.openTaskCount ?? 0}
        </span>
      ),
    },
    {
      key: 'taskDueDate',
      header: 'Task Due Date',
      render: (row: any) => (
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {row.nextDueDate ? formatDate(row.nextDueDate) : '-'}
        </span>
      ),
    },
    {
      key: 'salesAgent',
      header: 'Sales Agent',
      render: (row: any) => (
        <span className="text-xs font-medium" style={{ color: row.assignedTo ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {row.assignedTo?.name || 'Unassigned'}
        </span>
      ),
    },
  ];

  // Columns for the leads fallback view (no tasks yet)
  const leadColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: any) => (
        <span className="text-sm font-medium">{row.fullName}</span>
      ),
    },
    {
      key: 'emailMobile',
      header: 'Email / Mobile',
      render: (row: any) => (
        <div>
          <div className="text-xs">{row.email}</div>
          {row.phone && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.phone}</div>}
        </div>
      ),
    },
    {
      key: 'userType',
      header: 'User Type',
      width: '200px',
      render: (row: any) => {
        const cfg = (LEAD_STATUS_CONFIG as any)[row.status];
        if (!cfg) return row.status;
        return <WideStatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />;
      },
    },
    {
      key: 'taskCount',
      header: 'Task #',
      render: () => (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>0</span>
      ),
    },
    {
      key: 'salesAgent',
      header: 'Sales Agent',
      render: (row: any) => (
        <span className="text-xs font-medium" style={{ color: row.assignedTo ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {row.assignedTo?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Created',
      render: (row: any) => (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Leads & Tasks</h1>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>+ Create Lead</Button>
          )}
        </div>
      </div>

      {/* Lead Summary Stats */}
      {dashData && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Hot', value: (dashData as any).leadsByTemperature?.hot || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
            { label: 'Warm', value: (dashData as any).leadsByTemperature?.warm || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
            { label: 'Cold', value: (dashData as any).leadsByTemperature?.cold || 0, color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
            { label: 'New', value: (dashData as any).leadsByCategory?.new || 0, color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
            { label: 'Renewal', value: (dashData as any).leadsByCategory?.renewal || 0, color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
            { label: 'Lost', value: (dashData as any).leadsByCategory?.lost || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'LR', value: (dashData as any).lateResponseCount || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { label: 'LLR', value: (dashData as any).lateLateResponseCount || 0, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: bg }}>
              <span className="text-sm font-bold" style={{ color }}>{value}</span>
              <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mine / All Toggle */}
        {!isSalesExec && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border-default)' }}>
            {(['mine', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setScope(s); setPage(1); }}
                className="px-4 py-1.5 text-xs font-semibold transition-colors capitalize"
                style={{
                  background: scope === s ? 'var(--color-accent-blue)' : 'var(--color-bg-card)',
                  color: scope === s ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {s === 'mine' ? 'Mine' : 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDateFrom}
            onChange={(e) => { setDueDateFrom(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
            placeholder="Start date"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
          <input
            type="date"
            value={dueDateTo}
            onChange={(e) => { setDueDateTo(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
            placeholder="End date"
          />
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <Input
            placeholder="Search User / Customer"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Search + Reset buttons */}
        <Button size="sm" onClick={() => setPage(1)}>Search</Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>Reset</Button>
      </div>

      {/* Note */}
      <p className="text-xs italic" style={{ color: 'var(--color-accent-red)' }}>
        Please Note: The below task count is for <strong>OPEN</strong> tasks only
      </p>

      {/* Time-based Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {TIME_TABS.map((tab) => {
          const count = stats[tab.key as keyof typeof stats] ?? 0;
          const active = timePeriod === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setTimePeriod(tab.key); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--color-accent-blue)' : 'var(--color-bg-hover)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Results info bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {displayMeta && (
            <span
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--color-accent-blue)', color: '#fff' }}
            >
              {displayMeta.total} {showTasksView ? 'lead/tasks' : 'leads'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => { setLimit(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
          >
            {PER_PAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <LoadingState message="Loading leads & tasks..." />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
          <DataTable
            columns={showTasksView ? taskColumns : leadColumns}
            data={displayData}
            onRowClick={(row) => router.push(`/sales/leads/${row.id}`)}
            emptyMessage="No leads or tasks found"
            selectable
            selectedIds={selectedRows}
            onSelectionChange={setSelectedRows}
          />
        </div>
      )}

      {/* Pagination */}
      {displayMeta && displayMeta.totalPages > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Showing {Math.min((page - 1) * Number(limit) + 1, displayMeta.total)} to {Math.min(page * Number(limit), displayMeta.total)} of {displayMeta.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded text-xs disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(displayMeta.totalPages, 5) }, (_, i) => {
              let p: number;
              if (displayMeta.totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= displayMeta.totalPages - 2) {
                p = displayMeta.totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-7 h-7 rounded text-xs font-medium"
                  style={{
                    background: page === p ? 'var(--color-accent-blue)' : 'transparent',
                    color: page === p ? '#fff' : 'var(--color-accent-blue)',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(displayMeta.totalPages, page + 1))}
              disabled={page >= displayMeta.totalPages}
              className="px-2 py-1 rounded text-xs disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={handleCloseModal} title="Create New Lead" width="520px">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Product Type *"
              options={CREATE_PRODUCT_OPTIONS}
              value={form.productType}
              onChange={(e) => handleFormChange('productType', e.target.value)}
            />
            <Select
              label="Lead Source *"
              options={CREATE_SOURCE_OPTIONS}
              value={form.source}
              onChange={(e) => handleFormChange('source', e.target.value)}
            />
          </div>

          <Input
            label="Full Name *"
            placeholder="Enter customer full name"
            value={form.fullName}
            onChange={(e) => handleFormChange('fullName', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              placeholder="customer@example.com"
              value={form.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+971 50 123 4567"
              value={form.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
            />
          </div>

          <Input
            label="Company"
            placeholder="Company name (optional)"
            value={form.company}
            onChange={(e) => handleFormChange('company', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Currency"
              options={CURRENCY_OPTIONS}
              value={form.currency}
              onChange={(e) => handleFormChange('currency', e.target.value)}
            />
            <Select
              label="Contact Preference"
              options={CONTACT_PREF_OPTIONS}
              value={form.contactPref}
              onChange={(e) => handleFormChange('contactPref', e.target.value)}
            />
          </div>

          {formError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--color-accent-red)', background: 'rgba(239,68,68,0.08)' }}>
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={handleCloseModal}>Cancel</Button>
            <Button size="sm" onClick={handleCreateSubmit} loading={createLead.isPending}>Create Lead</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

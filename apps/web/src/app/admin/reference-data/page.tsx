'use client';

import { useState, useMemo } from 'react';
import { useAdminReferenceData, useCreateReferenceData, useDeleteReferenceData, useExportReferenceDataCsv, useImportReferenceDataCsv } from '@/hooks/use-api';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Database, Plus, Trash2, Search, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  COUNTRY: 'Countries',
  NAV_AREA: 'Navigation Areas',
  CURRENCY: 'Currencies',
  HULL_TYPE: 'Hull Types',
  CRAFT_TYPE: 'Craft Types',
  BARGE_TYPE: 'Barge Types',
  CLASSIFICATION: 'Classification Societies',
  LIABILITY_TYPE: 'Liability Types',
  CARGO_CATEGORY: 'Cargo Categories',
  CARGO_TYPE: 'Cargo Types',
  OPERATING_WATERS: 'Operating Waters',
  BARGE_OP_TYPE: 'Barge Operation Types',
  BARGE_CARGO: 'Barge Cargo Types',
  JETSKI_BRAND: 'Jet Ski Brands',
  SPEEDBOAT_TYPE: 'Speedboat Types',
  ENGINE_TYPE: 'Engine Types',
  ENGINE_CONFIG: 'Engine Configurations',
  PACKING_TYPE: 'Packing Types',
  TRADE_LANE: 'Trade Lanes',
  PLEASURE_USE: 'Pleasure Use Types',
  SPEEDBOAT_USE: 'Speedboat Use Types',
  JETSKI_STORAGE: 'Jet Ski Storage',
  SPEEDBOAT_STORAGE: 'Speedboat Storage',
  LIABILITY_LIMIT: 'Liability Limits',
  TPL_LIMIT: 'TPL Limits',
};

export default function ReferenceDataPage() {
  const { data: allData, isLoading, error, refetch } = useAdminReferenceData();
  const createEntry = useCreateReferenceData();
  const deleteEntry = useDeleteReferenceData();
  const { exportCsv } = useExportReferenceDataCsv();
  const importCsv = useImportReferenceDataCsv();

  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ category: '', code: '', label: '', sortOrder: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Group by category
  const grouped = useMemo(() => {
    if (!allData) return {};
    const map: Record<string, any[]> = {};
    for (const [cat, items] of Object.entries(allData)) {
      map[cat] = items as any[];
    }
    return map;
  }, [allData]);

  const categories = Object.keys(grouped).sort();

  const filteredCategories = search
    ? categories.filter(c =>
      c.toLowerCase().includes(search.toLowerCase()) ||
      (CATEGORY_LABELS[c] || '').toLowerCase().includes(search.toLowerCase()) ||
      grouped[c]?.some((item: any) => item.label?.toLowerCase().includes(search.toLowerCase()))
    )
    : categories;

  const handleAdd = async () => {
    if (!addForm.category || !addForm.code || !addForm.label) return;
    try {
      await createEntry.mutateAsync(addForm);
      refetch();
      setAddModal(false);
      setAddForm({ category: '', code: '', label: '', sortOrder: 0 });
    } catch (e: any) {
      alert(e?.message || 'Failed to create entry');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEntry.mutateAsync(deleteConfirm.id);
      refetch();
      setDeleteConfirm(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete entry');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reference-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    try {
      const result = await importCsv.mutateAsync(importText);
      setImportResult(result);
      if (result.created > 0) refetch();
    } catch (e: any) {
      alert(e?.message || 'Import failed');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string || '');
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  if (isLoading) return <LoadingState message="Loading reference data..." />;
  if (error) return <ErrorState message="Failed to load reference data" onRetry={refetch} />;

  const totalEntries = Object.values(grouped).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database size={20} style={{ color: 'var(--color-accent-blue)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Reference Data</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{categories.length} categories, {totalEntries} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setImportText(''); setImportResult(null); setImportModal(true); }}>
            <Upload size={14} /> Import CSV
          </Button>
          <Button size="sm" onClick={() => { setAddForm({ category: expandedCat || '', code: '', label: '', sortOrder: 0 }); setAddModal(true); }}>
            <Plus size={14} /> Add Entry
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
          placeholder="Search categories or entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      {filteredCategories.length === 0 ? (
        <Card><EmptyState icon={<Database size={32} />} title="No matching categories" message="Try a different search term." /></Card>
      ) : (
        <div className="space-y-2">
          {filteredCategories.map(cat => {
            const expanded = expandedCat === cat;
            const items = grouped[cat] || [];
            return (
              <Card key={cat} padding={false}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedCat(expanded ? null : cat)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                      {items.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{cat}</span>
                    {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                  </div>
                </button>
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <div className="px-4 py-3">
                      {items.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No entries in this category.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {items.map((item: any) => (
                            <div key={item.id || item.code} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'var(--color-bg-hover)' }}>
                              <span style={{ color: 'var(--color-text-primary)' }}>{item.label || item.code}</span>
                              {item.id && (
                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item); }} className="p-0.5 rounded" style={{ color: 'var(--color-text-muted)' }}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Entry Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Reference Data Entry" width="420px">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={addForm.category}
              onChange={e => setAddForm({ ...addForm, category: e.target.value })}
            >
              <option value="">Select category...</option>
              {categories.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
              ))}
              <option value="__NEW__">+ New Category</option>
            </select>
          </div>
          {addForm.category === '__NEW__' && (
            <Input label="New Category Code" placeholder="e.g. VESSEL_FLAG" value={addForm.category === '__NEW__' ? '' : addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value.toUpperCase() })} />
          )}
          <Input label="Code" placeholder="e.g. AE" value={addForm.code} onChange={e => setAddForm({ ...addForm, code: e.target.value })} />
          <Input label="Label" placeholder="e.g. United Arab Emirates" value={addForm.label} onChange={e => setAddForm({ ...addForm, label: e.target.value })} />
          <Input label="Sort Order" type="number" value={addForm.sortOrder} onChange={e => setAddForm({ ...addForm, sortOrder: parseInt(e.target.value) || 0 })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={createEntry.isPending}>Add Entry</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Entry" width="380px">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Are you sure you want to delete <strong>{deleteConfirm?.label || deleteConfirm?.code}</strong> from {deleteConfirm?.category}?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteEntry.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import Reference Data (CSV)" width="560px">
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Upload a CSV file or paste CSV content. Required columns: <strong>category</strong>, <strong>code</strong>, <strong>label</strong>. Optional: <strong>sortOrder</strong>. Duplicate entries are skipped.
          </p>

          <div>
            <label
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer text-sm"
              style={{ border: '2px dashed var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              <Upload size={16} />
              <span>Choose CSV file...</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <textarea
            className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none resize-y"
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', minHeight: '120px' }}
            placeholder="category,code,label,sortOrder&#10;COUNTRY,ZA,South Africa,0&#10;HULL_TYPE,CATAMARAN,Catamaran,5"
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportResult(null); }}
          />

          {importResult && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-bg-hover)' }}>
              <p style={{ color: 'var(--color-text-primary)' }}>
                <strong>{importResult.created}</strong> created, <strong>{importResult.skipped}</strong> skipped
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-1 space-y-0.5" style={{ color: 'var(--color-accent-red, #ef4444)' }}>
                  {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setImportModal(false)}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button size="sm" onClick={handleImport} loading={importCsv.isPending} disabled={!importText.trim()}>
                Import
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

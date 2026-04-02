'use client';

import { useState } from 'react';
import {
  useAdminProducts, useUpdateProduct, useCreateProduct,
  useAdminModifiers, useUpdateModifier, useCreateModifier,
  useAdminInsurers, useAdminRateTables, useUpsertRateTable,
} from '@/hooks/use-api';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Package, Pencil, Sliders, ChevronDown, ChevronUp, Plus, BarChart3 } from 'lucide-react';

const MODIFIER_TYPES = ['CLAIMS', 'AGE', 'ICC', 'ROUTE', 'USE', 'RACING', 'MODE', 'WAR', 'PERISHABLE', 'TPL', 'POLLUTION', 'LOH'];

export default function ProductsManagementPage() {
  const { data: products, isLoading, error, refetch } = useAdminProducts(false);
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const { data: modifiers, refetch: refetchModifiers } = useAdminModifiers();
  const updateModifier = useUpdateModifier();
  const createModifier = useCreateModifier();
  const { data: insurers } = useAdminInsurers(false);

  const [editProduct, setEditProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    code: '', label: '', description: '', iconKey: '📦', color: '#0ea5e9',
    estimatedMinutes: 3, baseRateMin: 0.01, baseRateMax: 0.03,
    deductibleRate: 0.005, coverageMultiplier: 1.0, valueField: 'vesselValue',
    scoringWeight: 10, formStepsJson: '["Details","Contact"]',
    formFieldsJson: '{}', defaultsJson: '{}',
  });
  const [expandedSection, setExpandedSection] = useState<Record<string, string | null>>({});
  const [editModifier, setEditModifier] = useState<any>(null);
  const [modForm, setModForm] = useState<any>({});
  const [addModModal, setAddModModal] = useState<any>(null);
  const [newModForm, setNewModForm] = useState<any>({ modifierType: 'CLAIMS', conditionKey: '', factor: 1.0 });
  const [rateProductId, setRateProductId] = useState<string | null>(null);

  const openEditProduct = (p: any) => {
    setEditForm({
      label: p.label, description: p.description,
      baseRateMin: p.baseRateMin, baseRateMax: p.baseRateMax,
      deductibleRate: p.deductibleRate, coverageMultiplier: p.coverageMultiplier,
      estimatedMinutes: p.estimatedMinutes, scoringWeight: p.scoringWeight,
      isActive: p.isActive,
    });
    setEditProduct(p);
  };

  const handleSaveProduct = async () => {
    if (!editProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editProduct.id, ...editForm });
      refetch();
      setEditProduct(null);
    } catch (e: any) { alert(e?.message || 'Failed to update product'); }
  };

  const handleCreateProduct = async () => {
    if (!createForm.code || !createForm.label) return;
    try {
      await createProduct.mutateAsync(createForm);
      refetch();
      setCreateModal(false);
    } catch (e: any) { alert(e?.message || 'Failed to create product'); }
  };

  const openEditModifier = (m: any) => {
    setModForm({ modifierType: m.modifierType, conditionKey: m.conditionKey, factor: m.factor, isActive: m.isActive });
    setEditModifier(m);
  };

  const handleSaveModifier = async () => {
    if (!editModifier) return;
    try {
      await updateModifier.mutateAsync({ id: editModifier.id, factor: parseFloat(modForm.factor), isActive: modForm.isActive });
      refetchModifiers();
      setEditModifier(null);
    } catch (e: any) { alert(e?.message || 'Failed to update modifier'); }
  };

  const handleAddModifier = async () => {
    if (!newModForm.conditionKey) return;
    try {
      await createModifier.mutateAsync({ ...newModForm, factor: parseFloat(newModForm.factor), productId: addModModal?.id || null });
      refetchModifiers();
      setAddModModal(null);
    } catch (e: any) { alert(e?.message || 'Failed to create modifier'); }
  };

  const toggleSection = (productId: string, section: string) => {
    setExpandedSection(prev => ({
      ...prev,
      [productId]: prev[productId] === section ? null : section,
    }));
    if (section === 'rates') setRateProductId(productId);
  };

  if (isLoading) return <LoadingState message="Loading products..." />;
  if (error) return <ErrorState message="Failed to load products" onRetry={refetch} />;

  const productList = products || [];
  const modifierList = modifiers || [];
  const insurerList = insurers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={20} style={{ color: 'var(--color-accent-blue)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Products & Rates</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{productList.length} products configured</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)}><Plus size={14} /> New Product</Button>
      </div>

      {/* Products List */}
      {productList.length === 0 ? (
        <Card><EmptyState icon={<Package size={32} />} title="No products" message="Click New Product to create one." /></Card>
      ) : (
        <div className="space-y-3">
          {productList.map((p: any) => {
            const section = expandedSection[p.id] || null;
            const productModifiers = modifierList.filter((m: any) => m.productId === p.id);
            return (
              <Card key={p.id} padding={false}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.iconKey}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            background: p.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: p.isActive ? '#10b981' : '#ef4444',
                          }}>{p.isActive ? 'Active' : 'Inactive'}</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>{p.code}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{p.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditProduct(p)}><Pencil size={14} /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleSection(p.id, 'rates')}>
                        <BarChart3 size={14} /> Rates {section === 'rates' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleSection(p.id, 'modifiers')}>
                        <Sliders size={14} /> Modifiers {section === 'modifiers' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-6 mt-3">
                    {[
                      { label: 'Base Rate', value: `${p.baseRateMin}% – ${p.baseRateMax}%` },
                      { label: 'Deductible', value: `${p.deductibleRate}%` },
                      { label: 'Coverage Mult.', value: `${p.coverageMultiplier}x` },
                      { label: 'Scoring Weight', value: `${p.scoringWeight} pts` },
                      { label: 'Est. Time', value: `${p.estimatedMinutes} min` },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate Tables Section */}
                {section === 'rates' && (
                  <div style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <div className="px-4 py-3">
                      <RateTablePanel productId={p.id} insurers={insurerList} />
                    </div>
                  </div>
                )}

                {/* Modifiers Section */}
                {section === 'modifiers' && (
                  <div style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>RISK MODIFIERS ({productModifiers.length})</h4>
                        <Button variant="ghost" size="sm" onClick={() => { setNewModForm({ modifierType: 'CLAIMS', conditionKey: '', factor: 1.0 }); setAddModModal(p); }}>
                          <Plus size={12} /> Add
                        </Button>
                      </div>
                      {productModifiers.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No modifiers for this product. Global modifiers still apply.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {productModifiers.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                              <div>
                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{m.modifierType}</span>
                                <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{m.conditionKey}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-semibold" style={{
                                  color: m.factor > 1 ? 'var(--color-accent-red)' : m.factor < 1 ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                                }}>{m.factor.toFixed(2)}x</span>
                                <button onClick={() => openEditModifier(m)} className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }}><Pencil size={12} /></button>
                              </div>
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

      {/* Global Modifiers Section */}
      {modifierList.filter((m: any) => !m.productId).length > 0 && (
        <Card>
          <CardHeader title="Global Risk Modifiers" subtitle="Apply across all products" action={
            <Button variant="ghost" size="sm" onClick={() => { setNewModForm({ modifierType: 'CLAIMS', conditionKey: '', factor: 1.0 }); setAddModModal({ id: null }); }}>
              <Plus size={12} /> Add Global
            </Button>
          } />
          <div className="grid grid-cols-2 gap-2">
            {modifierList.filter((m: any) => !m.productId).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                <div>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{m.modifierType}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{m.conditionKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold" style={{
                    color: m.factor > 1 ? 'var(--color-accent-red)' : m.factor < 1 ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  }}>{m.factor.toFixed(2)}x</span>
                  <button onClick={() => openEditModifier(m)} className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }}><Pencil size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Product Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Product" width="560px">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code (uppercase)" placeholder="e.g. YACHT" value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} />
            <Input label="Label" placeholder="e.g. Yacht Insurance" value={createForm.label} onChange={e => setCreateForm({ ...createForm, label: e.target.value })} />
          </div>
          <Input label="Description" placeholder="Short description for the landing page" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Icon (emoji)" value={createForm.iconKey} onChange={e => setCreateForm({ ...createForm, iconKey: e.target.value })} />
            <Input label="Color (hex)" value={createForm.color} onChange={e => setCreateForm({ ...createForm, color: e.target.value })} />
            <Input label="Est. Minutes" type="number" value={createForm.estimatedMinutes} onChange={e => setCreateForm({ ...createForm, estimatedMinutes: parseInt(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Base Rate Min" type="number" step="0.001" value={createForm.baseRateMin} onChange={e => setCreateForm({ ...createForm, baseRateMin: parseFloat(e.target.value) })} />
            <Input label="Base Rate Max" type="number" step="0.001" value={createForm.baseRateMax} onChange={e => setCreateForm({ ...createForm, baseRateMax: parseFloat(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Deductible Rate" type="number" step="0.001" value={createForm.deductibleRate} onChange={e => setCreateForm({ ...createForm, deductibleRate: parseFloat(e.target.value) })} />
            <Input label="Coverage Mult." type="number" step="0.01" value={createForm.coverageMultiplier} onChange={e => setCreateForm({ ...createForm, coverageMultiplier: parseFloat(e.target.value) })} />
            <Input label="Scoring Weight" type="number" value={createForm.scoringWeight} onChange={e => setCreateForm({ ...createForm, scoringWeight: parseInt(e.target.value) })} />
          </div>
          <Input label="Value Field" placeholder="e.g. vesselValue, cargoValue" value={createForm.valueField} onChange={e => setCreateForm({ ...createForm, valueField: e.target.value })} />
          <Input label="Form Steps (JSON)" placeholder='["Step 1","Step 2","Contact"]' value={createForm.formStepsJson} onChange={e => setCreateForm({ ...createForm, formStepsJson: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateProduct} loading={createProduct.isPending}>Create Product</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={`Edit ${editProduct?.label || 'Product'}`} width="520px">
        <div className="space-y-4">
          <Input label="Label" value={editForm.label || ''} onChange={e => setEditForm({ ...editForm, label: e.target.value })} />
          <Input label="Description" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Base Rate Min (%)" type="number" step="0.001" value={editForm.baseRateMin ?? ''} onChange={e => setEditForm({ ...editForm, baseRateMin: parseFloat(e.target.value) })} />
            <Input label="Base Rate Max (%)" type="number" step="0.001" value={editForm.baseRateMax ?? ''} onChange={e => setEditForm({ ...editForm, baseRateMax: parseFloat(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Deductible Rate (%)" type="number" step="0.001" value={editForm.deductibleRate ?? ''} onChange={e => setEditForm({ ...editForm, deductibleRate: parseFloat(e.target.value) })} />
            <Input label="Coverage Multiplier" type="number" step="0.01" value={editForm.coverageMultiplier ?? ''} onChange={e => setEditForm({ ...editForm, coverageMultiplier: parseFloat(e.target.value) })} />
            <Input label="Scoring Weight" type="number" value={editForm.scoringWeight ?? ''} onChange={e => setEditForm({ ...editForm, scoringWeight: parseInt(e.target.value) })} />
          </div>
          <Input label="Est. Minutes" type="number" value={editForm.estimatedMinutes ?? ''} onChange={e => setEditForm({ ...editForm, estimatedMinutes: parseInt(e.target.value) })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="prodActive" checked={editForm.isActive ?? true} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} />
            <label htmlFor="prodActive" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEditProduct(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveProduct} loading={updateProduct.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modifier Modal */}
      <Modal open={!!editModifier} onClose={() => setEditModifier(null)} title="Edit Risk Modifier" width="400px">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Type</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{modForm.modifierType}</div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Condition</div>
            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{modForm.conditionKey}</div>
          </div>
          <Input label="Factor" type="number" step="0.01" value={modForm.factor ?? ''} onChange={e => setModForm({ ...modForm, factor: e.target.value })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="modActive" checked={modForm.isActive ?? true} onChange={e => setModForm({ ...modForm, isActive: e.target.checked })} />
            <label htmlFor="modActive" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEditModifier(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveModifier} loading={updateModifier.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Modifier Modal */}
      <Modal open={!!addModModal} onClose={() => setAddModModal(null)} title={`Add Modifier${addModModal?.label ? ` — ${addModModal.label}` : ' (Global)'}`} width="420px">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Modifier Type</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={newModForm.modifierType} onChange={e => setNewModForm({ ...newModForm, modifierType: e.target.value })}>
              {MODIFIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Condition Key" placeholder="e.g. 3+, ICC (A), Yes" value={newModForm.conditionKey} onChange={e => setNewModForm({ ...newModForm, conditionKey: e.target.value })} />
          <Input label="Factor" type="number" step="0.01" value={newModForm.factor} onChange={e => setNewModForm({ ...newModForm, factor: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setAddModModal(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAddModifier} loading={createModifier.isPending}>Add Modifier</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Rate Table Panel (per product) ──────────────────────────────────────────
function RateTablePanel({ productId, insurers }: { productId: string; insurers: any[] }) {
  const { data: rates, isLoading, refetch } = useAdminRateTables(productId);
  const upsertRate = useUpsertRateTable();
  const [editRate, setEditRate] = useState<any>(null);
  const [rateForm, setRateForm] = useState<any>({ insurerId: '', rate: '', effectiveFrom: '' });

  const handleSave = async () => {
    if (!rateForm.insurerId || !rateForm.rate) return;
    try {
      await upsertRate.mutateAsync({
        productId,
        insurerId: rateForm.insurerId,
        rate: parseFloat(rateForm.rate),
        effectiveFrom: rateForm.effectiveFrom || new Date().toISOString().split('T')[0],
      });
      refetch();
      setEditRate(null);
    } catch (e: any) { alert(e?.message || 'Failed to save rate'); }
  };

  if (isLoading) return <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading rates...</p>;

  const rateList = rates || [];
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>RATE TABLE ({rateList.length} entries)</h4>
        <Button variant="ghost" size="sm" onClick={() => { setRateForm({ insurerId: insurers[0]?.id || '', rate: '', effectiveFrom: today }); setEditRate('new'); }}>
          <Plus size={12} /> Add Rate
        </Button>
      </div>
      {rateList.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No rates configured for this product.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Insurer</th>
                <th className="text-right py-1.5 px-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Rate</th>
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Effective From</th>
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>To</th>
                <th className="py-1.5 px-2" />
              </tr>
            </thead>
            <tbody>
              {rateList.map((r: any) => {
                const insurer = insurers.find((i: any) => i.id === r.insurerId);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="py-1.5 px-2" style={{ color: 'var(--color-text-primary)' }}>{insurer?.name || r.insurerId}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold" style={{ color: 'var(--color-accent-blue)' }}>{(r.rate * 100).toFixed(3)}%</td>
                    <td className="py-1.5 px-2" style={{ color: 'var(--color-text-muted)' }}>{r.effectiveFrom?.split('T')[0]}</td>
                    <td className="py-1.5 px-2" style={{ color: 'var(--color-text-muted)' }}>{r.effectiveTo ? r.effectiveTo.split('T')[0] : '—'}</td>
                    <td className="py-1.5 px-2">
                      <button onClick={() => { setRateForm({ insurerId: r.insurerId, rate: r.rate, effectiveFrom: today }); setEditRate(r); }}
                        className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }}><Pencil size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upsert Rate Modal */}
      <Modal open={!!editRate} onClose={() => setEditRate(null)} title={editRate === 'new' ? 'Add Rate' : 'Update Rate'} width="400px">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Insurer</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              value={rateForm.insurerId} onChange={e => setRateForm({ ...rateForm, insurerId: e.target.value })}>
              <option value="">Select insurer...</option>
              {insurers.map((ins: any) => <option key={ins.id} value={ins.id}>{ins.name} ({ins.code})</option>)}
            </select>
          </div>
          <Input label="Rate (decimal, e.g. 0.0015)" type="number" step="0.0001" value={rateForm.rate} onChange={e => setRateForm({ ...rateForm, rate: e.target.value })} />
          <Input label="Effective From" type="date" value={rateForm.effectiveFrom} onChange={e => setRateForm({ ...rateForm, effectiveFrom: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEditRate(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={upsertRate.isPending}>Save Rate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

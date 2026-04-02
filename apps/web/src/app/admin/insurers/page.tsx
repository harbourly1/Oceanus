'use client';

import { useState } from 'react';
import { useAdminInsurers, useUpdateInsurer, useCreateInsurer } from '@/hooks/use-api';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Building2, Pencil, Plus } from 'lucide-react';

export default function InsurersManagementPage() {
  const { data: insurers, isLoading, error, refetch } = useAdminInsurers(false);
  const updateInsurer = useUpdateInsurer();
  const createInsurer = useCreateInsurer();

  const [editInsurer, setEditInsurer] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', code: '', rating: 'A', specialty: '',
    competitiveFactor: 1.0, responseHours: 4, sortOrder: 0,
  });

  const openEdit = (ins: any) => {
    setEditForm({
      name: ins.name,
      code: ins.code,
      rating: ins.rating,
      specialty: ins.specialty,
      competitiveFactor: ins.competitiveFactor,
      responseHours: ins.responseHours,
      sortOrder: ins.sortOrder,
      isActive: ins.isActive,
    });
    setEditInsurer(ins);
  };

  const handleSave = async () => {
    if (!editInsurer) return;
    try {
      await updateInsurer.mutateAsync({
        id: editInsurer.id,
        data: {
          ...editForm,
          competitiveFactor: parseFloat(editForm.competitiveFactor),
          responseHours: parseInt(editForm.responseHours),
          sortOrder: parseInt(editForm.sortOrder),
        },
      });
      refetch();
      setEditInsurer(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to update insurer');
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    try {
      await createInsurer.mutateAsync({
        ...createForm,
        competitiveFactor: parseFloat(String(createForm.competitiveFactor)),
        responseHours: parseInt(String(createForm.responseHours)),
        sortOrder: parseInt(String(createForm.sortOrder)),
      });
      refetch();
      setCreateModal(false);
      setCreateForm({ name: '', code: '', rating: 'A', specialty: '', competitiveFactor: 1.0, responseHours: 4, sortOrder: 0 });
    } catch (e: any) { alert(e?.message || 'Failed to create insurer'); }
  };

  if (isLoading) return <LoadingState message="Loading insurers..." />;
  if (error) return <ErrorState message="Failed to load insurers" onRetry={refetch} />;

  const insurerList = insurers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={20} style={{ color: 'var(--color-accent-blue)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Insurers</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{insurerList.length} insurer partners</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)}><Plus size={14} /> New Insurer</Button>
      </div>

      {/* Insurers Table */}
      {insurerList.length === 0 ? (
        <Card><EmptyState icon={<Building2 size={32} />} title="No insurers" message="Seed your database to add insurers." /></Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Logo', 'Name', 'Code', 'Rating', 'Specialty', 'Competitive Factor', 'Response (hrs)', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insurerList.map((ins: any) => (
                  <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{
                        background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-cyan))', color: '#fff',
                      }}>{ins.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{ins.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>{ins.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                      }}>{ins.rating}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ins.specialty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold" style={{
                        color: ins.competitiveFactor < 1 ? 'var(--color-accent-green)' : ins.competitiveFactor > 1 ? 'var(--color-accent-red)' : 'var(--color-text-primary)',
                      }}>{ins.competitiveFactor.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{ins.responseHours}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: ins.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: ins.isActive ? '#10b981' : '#ef4444',
                      }}>{ins.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ins)}><Pencil size={14} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={!!editInsurer} onClose={() => setEditInsurer(null)} title={`Edit ${editInsurer?.name || 'Insurer'}`} width="520px">
        <div className="space-y-4">
          <Input label="Name" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rating" value={editForm.rating || ''} onChange={e => setEditForm({ ...editForm, rating: e.target.value })} />
            <Input label="Specialty" value={editForm.specialty || ''} onChange={e => setEditForm({ ...editForm, specialty: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Competitive Factor" type="number" step="0.01" value={editForm.competitiveFactor ?? ''} onChange={e => setEditForm({ ...editForm, competitiveFactor: e.target.value })} />
            <Input label="Response Hours" type="number" value={editForm.responseHours ?? ''} onChange={e => setEditForm({ ...editForm, responseHours: e.target.value })} />
            <Input label="Sort Order" type="number" value={editForm.sortOrder ?? ''} onChange={e => setEditForm({ ...editForm, sortOrder: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="insActive" checked={editForm.isActive ?? true} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} />
            <label htmlFor="insActive" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEditInsurer(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={updateInsurer.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Create Insurer Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Insurer" width="520px">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" placeholder="e.g. Emirates Insurance" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            <Input label="Code (2 chars)" placeholder="e.g. EI" value={createForm.code} onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase().slice(0, 4) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rating" placeholder="e.g. A+" value={createForm.rating} onChange={e => setCreateForm({ ...createForm, rating: e.target.value })} />
            <Input label="Specialty" placeholder="e.g. Cargo & Transit" value={createForm.specialty} onChange={e => setCreateForm({ ...createForm, specialty: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Competitive Factor" type="number" step="0.01" value={createForm.competitiveFactor} onChange={e => setCreateForm({ ...createForm, competitiveFactor: parseFloat(e.target.value) || 1.0 })} />
            <Input label="Response Hours" type="number" value={createForm.responseHours} onChange={e => setCreateForm({ ...createForm, responseHours: parseInt(e.target.value) || 4 })} />
            <Input label="Sort Order" type="number" value={createForm.sortOrder} onChange={e => setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} loading={createInsurer.isPending}>Create Insurer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

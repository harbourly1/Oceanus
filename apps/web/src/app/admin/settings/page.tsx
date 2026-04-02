'use client';

import { useState } from 'react';
import { useSystemConfig, useUpdateSystemConfig } from '@/hooks/use-api';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Settings, Plus, Pencil, Save } from 'lucide-react';

export default function SystemSettingsPage() {
  const { data: configs, isLoading, error, refetch } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();

  const [editItem, setEditItem] = useState<any>(null);
  const [editValue, setEditValue] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ key: '', value: '', label: '', category: 'general' });

  const openEdit = (item: any) => {
    setEditValue(item.value);
    setEditItem(item);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    await updateConfig.mutateAsync({ key: editItem.key, value: editValue });
    setEditItem(null);
    refetch();
  };

  const handleAdd = async () => {
    if (!addForm.key || !addForm.value) return;
    await updateConfig.mutateAsync({
      key: addForm.key,
      value: addForm.value,
      label: addForm.label || addForm.key,
      category: addForm.category || 'general',
    });
    setAddModal(false);
    setAddForm({ key: '', value: '', label: '', category: 'general' });
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const allConfigs = configs || [];

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const item of allConfigs) {
    const cat = item.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            System Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Manage system-wide configuration parameters
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddModal(true)}>
          <Plus size={14} className="mr-1" /> Add Setting
        </Button>
      </div>

      {allConfigs.length === 0 ? (
        <EmptyState
          icon={<Settings size={32} />}
          title="No settings"
          message="No system configuration entries yet. Add your first setting to get started."
          action={<Button variant="primary" onClick={() => setAddModal(true)}>Add First Setting</Button>}
        />
      ) : (
        categories.map((cat) => (
          <Card key={cat}>
            <CardHeader title={cat.charAt(0).toUpperCase() + cat.slice(1)} />
            <div className="divide-y" style={{ borderColor: 'var(--color-border-default)' }}>
              {grouped[cat].map((item: any) => (
                <div key={item.key} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {item.label || item.key}
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {item.key}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-mono px-2 py-1 rounded"
                      style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                    >
                      {item.value}
                    </span>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-md hover:opacity-80"
                      style={{ background: 'var(--color-bg-hover)' }}
                      title="Edit value"
                    >
                      <Pencil size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      {/* Edit Setting Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit Setting - ${editItem?.label || editItem?.key || ''}`}>
        <div className="space-y-4">
          <div className="text-xs font-mono px-2 py-1 rounded inline-block" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
            {editItem?.key}
          </div>
          <Input
            label="Value"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button variant="primary" loading={updateConfig.isPending} onClick={handleSaveEdit}>
              <Save size={14} className="mr-1" /> Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Setting Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Setting">
        <div className="space-y-4">
          <Input
            label="Key"
            required
            value={addForm.key}
            onChange={(e) => setAddForm({ ...addForm, key: e.target.value })}
            placeholder="e.g. max_leads_per_day"
          />
          <Input
            label="Label"
            value={addForm.label}
            onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
            placeholder="e.g. Max Leads Per Day"
          />
          <Input
            label="Value"
            required
            value={addForm.value}
            onChange={(e) => setAddForm({ ...addForm, value: e.target.value })}
            placeholder="e.g. 50"
          />
          <Input
            label="Category"
            value={addForm.category}
            onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
            placeholder="e.g. general, allocation, notifications"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button variant="primary" loading={updateConfig.isPending} onClick={handleAdd}>
              <Plus size={14} className="mr-1" /> Add Setting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

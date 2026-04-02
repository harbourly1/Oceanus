'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useAllocationPools,
  useCreateAllocationPool,
  useDeleteAllocationPool,
  useUsers,
  useProductConfigMap,
} from '@/hooks/use-api';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ProductIcon } from '@/lib/product-icons';

export default function AllocationPage() {
  const productConfigMap = useProductConfigMap();
  const PRODUCT_OPTIONS = useMemo(() =>
    Object.entries(productConfigMap).map(([value, config]) => ({ value, label: config.label })), [productConfigMap]);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, error } = useAllocationPools();
  const { data: usersData } = useUsers('SALES_EXEC');
  const createPool = useCreateAllocationPool();
  const deletePool = useDeleteAllocationPool();

  const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ur', label: 'Urdu' },
    { value: 'tl', label: 'Tagalog' },
  ];

  const [form, setForm] = useState({
    name: '',
    productTypes: [] as string[],
    languages: ['en'] as string[],
    maxDailyLeads: 10,
    maxWeeklyLeads: 50,
    agentIds: [] as string[],
  });

  if (isLoading) return <LoadingState message="Loading allocation pools..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const pools = data || [];
  const agents = usersData || [];

  const columns = [
    { key: 'name', header: 'Pool Name' },
    {
      key: 'productTypes',
      header: 'Products',
      render: (r: any) => {
        const types: string[] = JSON.parse(r.productTypes || '[]');
        return (
          <div className="flex gap-1 flex-wrap">
            {types.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ background: 'var(--color-bg-hover)' }}>
                <ProductIcon iconKey={productConfigMap[t]?.iconKey} size={14} /> {t}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'languages',
      header: 'Languages',
      render: (r: any) => {
        const langs: string[] = JSON.parse(r.languages || '["en"]');
        return (
          <div className="flex gap-1 flex-wrap">
            {langs.map((l) => (
              <span key={l} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)' }}>
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'agents',
      header: 'Agents',
      render: (r: any) => (
        <span className="text-sm">{r.agents?.length || 0} agents</span>
      ),
    },
    {
      key: 'limits',
      header: 'Limits (D/W)',
      render: (r: any) => (
        <span className="text-sm">{r.maxDailyLeads} / {r.maxWeeklyLeads}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r: any) => (
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: r.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: r.isActive ? '#10b981' : '#ef4444',
          }}
        >
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r: any) => (
        <div className="flex gap-2">
          <Link href={`/sales/allocation/${r.id}`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
          {r.isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => deletePool.mutate(r.id)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  function toggleProduct(productType: string) {
    setForm((f) => ({
      ...f,
      productTypes: f.productTypes.includes(productType)
        ? f.productTypes.filter((p) => p !== productType)
        : [...f.productTypes, productType],
    }));
  }

  function toggleLanguage(lang: string) {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
  }

  function toggleAgent(agentId: string) {
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.includes(agentId)
        ? f.agentIds.filter((a) => a !== agentId)
        : [...f.agentIds, agentId],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createPool.mutateAsync(form);
    setShowCreate(false);
    setForm({ name: '', productTypes: [], languages: ['en'], maxDailyLeads: 10, maxWeeklyLeads: 50, agentIds: [] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Lead Allocation Pools
        </h1>
        <div className="flex gap-3">
          <Link href="/sales/allocation/unassigned">
            <Button size="sm" variant="secondary">Unassigned Queue</Button>
          </Link>
          <Link href="/sales/allocation/logs">
            <Button size="sm" variant="secondary">Assignment Logs</Button>
          </Link>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Pool</Button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
        <DataTable columns={columns} data={pools} emptyMessage="No allocation pools configured" />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Allocation Pool">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Pool Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Cargo & Hull Team"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Product Types *
            </label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleProduct(opt.value)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: form.productTypes.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-bg-hover)',
                    color: form.productTypes.includes(opt.value) ? 'white' : 'var(--color-text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleLanguage(opt.value)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: form.languages.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-bg-hover)',
                    color: form.languages.includes(opt.value) ? 'white' : 'var(--color-text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Daily Leads"
              type="number"
              min={1}
              max={100}
              value={form.maxDailyLeads}
              onChange={(e) => setForm({ ...form, maxDailyLeads: Number(e.target.value) })}
            />
            <Input
              label="Max Weekly Leads"
              type="number"
              min={1}
              max={500}
              value={form.maxWeeklyLeads}
              onChange={(e) => setForm({ ...form, maxWeeklyLeads: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Agents *
            </label>
            <div className="flex flex-wrap gap-2">
              {agents.map((agent: any) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: form.agentIds.includes(agent.id) ? 'var(--color-accent)' : 'var(--color-bg-hover)',
                    color: form.agentIds.includes(agent.id) ? 'white' : 'var(--color-text-primary)',
                  }}
                >
                  {agent.name}
                </button>
              ))}
            </div>
            {agents.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No sales agents found</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              type="submit"
              loading={createPool.isPending}
              disabled={!form.name || form.productTypes.length === 0 || form.agentIds.length === 0}
            >
              Create Pool
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

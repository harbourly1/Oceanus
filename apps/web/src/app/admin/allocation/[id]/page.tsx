'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useAllocationPool,
  useUpdateAllocationPool,
  useDeleteAllocationPool,
  useUsers,
  useUpdateUserLeave,
  useProductConfigMap,
} from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function AdminPoolDetailPage() {
  const productConfigMap = useProductConfigMap();
  const PRODUCT_OPTIONS = useMemo(() =>
    Object.entries(productConfigMap).map(([value, config]) => ({ value, label: config.label })), [productConfigMap]);
  const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ur', label: 'Urdu' },
    { value: 'tl', label: 'Tagalog' },
  ];
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;

  const { data: pool, isLoading, error } = useAllocationPool(poolId);
  const { data: allAgents } = useUsers('SALES_EXEC');
  const updatePool = useUpdateAllocationPool();
  const deletePool = useDeleteAllocationPool();
  const updateLeave = useUpdateUserLeave();

  const [form, setForm] = useState({
    name: '',
    productTypes: [] as string[],
    languages: ['en'] as string[],
    maxDailyLeads: 10,
    maxWeeklyLeads: 50,
    agentIds: [] as string[],
  });

  useEffect(() => {
    if (pool) {
      setForm({
        name: pool.name,
        productTypes: JSON.parse(pool.productTypes || '[]'),
        languages: JSON.parse(pool.languages || '["en"]'),
        maxDailyLeads: pool.maxDailyLeads,
        maxWeeklyLeads: pool.maxWeeklyLeads,
        agentIds: pool.agents?.map((a: any) => a.userId) || [],
      });
    }
  }, [pool]);

  if (isLoading) return <LoadingState message="Loading pool..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!pool) return <ErrorState message="Pool not found" />;

  function toggleProduct(productType: string) {
    setForm((f) => ({ ...f, productTypes: f.productTypes.includes(productType) ? f.productTypes.filter((p) => p !== productType) : [...f.productTypes, productType] }));
  }

  function toggleLanguage(lang: string) {
    setForm((f) => ({ ...f, languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang] }));
  }

  function toggleAgent(agentId: string) {
    setForm((f) => ({ ...f, agentIds: f.agentIds.includes(agentId) ? f.agentIds.filter((a) => a !== agentId) : [...f.agentIds, agentId] }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updatePool.mutateAsync({ id: poolId, ...form });
  }

  async function handleDeactivate() {
    if (confirm('Are you sure you want to deactivate this pool?')) {
      await deletePool.mutateAsync(poolId);
      router.push('/admin/allocation');
    }
  }

  async function toggleLeave(userId: string, currentOnLeave: boolean) {
    await updateLeave.mutateAsync({ userId, isOnLeave: !currentOnLeave });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Edit Pool: {pool.name}</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{pool._count?.assignmentLogs || 0} leads assigned through this pool</p>
        </div>
        <Link href="/admin/allocation"><Button size="sm" variant="secondary">Back to Pools</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-6" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Pool Configuration</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Pool Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Product Types</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => toggleProduct(opt.value)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: form.productTypes.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: form.productTypes.includes(opt.value) ? 'white' : 'var(--color-text-primary)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => toggleLanguage(opt.value)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: form.languages.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: form.languages.includes(opt.value) ? 'white' : 'var(--color-text-primary)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Max Daily Leads" type="number" min={1} max={100} value={form.maxDailyLeads} onChange={(e) => setForm({ ...form, maxDailyLeads: Number(e.target.value) })} />
              <Input label="Max Weekly Leads" type="number" min={1} max={500} value={form.maxWeeklyLeads} onChange={(e) => setForm({ ...form, maxWeeklyLeads: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Agents in Pool</label>
              <div className="flex flex-wrap gap-2">
                {(allAgents || []).map((agent: any) => (
                  <button key={agent.id} type="button" onClick={() => toggleAgent(agent.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: form.agentIds.includes(agent.id) ? 'var(--color-accent)' : 'var(--color-bg-hover)', color: form.agentIds.includes(agent.id) ? 'white' : 'var(--color-text-primary)' }}>
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button type="button" variant="secondary" onClick={handleDeactivate} disabled={!pool.isActive}>Deactivate Pool</Button>
              <Button type="submit" loading={updatePool.isPending} disabled={form.productTypes.length === 0 || form.agentIds.length === 0}>Save Changes</Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl p-6" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Agent Status & Rotation</h2>
          <div className="space-y-3">
            {pool.agents?.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No agents assigned to this pool</p>}
            {pool.agents?.map((pa: any) => (
              <div key={pa.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{pa.user?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Last assigned: {pa.lastAssignedAt ? new Date(pa.lastAssignedAt).toLocaleString() : 'Never'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: pa.user?.isOnLeave ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: pa.user?.isOnLeave ? '#ef4444' : '#10b981' }}>
                    {pa.user?.isOnLeave ? 'On Leave' : 'Available'}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => toggleLeave(pa.userId, pa.user?.isOnLeave || false)} loading={updateLeave.isPending}>
                    {pa.user?.isOnLeave ? 'Set Available' : 'Set On Leave'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useDashboard, useAccountsQueueStats } from '@/hooks/use-api';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, ClipboardList, TrendingUp } from 'lucide-react';

export default function AccountsDashboard() {
  const { data, isLoading, error } = useDashboard();
  const { data: queueStats } = useAccountsQueueStats();
  const router = useRouter();

  if (isLoading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const stats = queueStats || { approval: { pending: 0, inReview: 0 }, completion: { pending: 0, inReview: 0 } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Accounts Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Invoice approvals and policy cancellations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => router.push('/accounts/approval')}>
          <StatCard label="Approval Queue" value={stats.approval.pending + stats.approval.inReview} icon={<Clock size={18} />} color="var(--color-accent-amber)" />
        </div>
        <div className="cursor-pointer" onClick={() => router.push('/accounts/completion')}>
          <StatCard label="Cancellation Queue" value={stats.completion.pending + stats.completion.inReview} icon={<CheckCircle size={18} />} color="var(--color-accent-blue)" />
        </div>
        <StatCard label="Pending Invoices" value={data.pendingInvoices || 0} icon={<ClipboardList size={18} />} />
        <StatCard label="Active Policies" value={data.activePolicies || 0} icon={<TrendingUp size={18} />} color="var(--color-accent-green)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Approval Queue" subtitle="New policy and endorsement invoices awaiting approval"
            action={
              <button className="text-xs hover:underline" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}
                onClick={() => router.push('/accounts/approval')}>View All &rarr;</button>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--color-accent-amber)' }}>{stats.approval.pending}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pending</div>
            </div>
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--color-accent-blue)' }}>{stats.approval.inReview}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>In Review</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Cancellation Queue" subtitle="Cancellation endorsements awaiting review"
            action={
              <button className="text-xs hover:underline" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}
                onClick={() => router.push('/accounts/completion')}>View All &rarr;</button>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--color-accent-amber)' }}>{stats.completion.pending}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pending</div>
            </div>
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--color-accent-blue)' }}>{stats.completion.inReview}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>In Review</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

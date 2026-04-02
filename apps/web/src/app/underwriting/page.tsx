'use client';

import { useDashboard, useUwQueue } from '@/hooks/use-api';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useRouter } from 'next/navigation';
import { ClipboardList, RefreshCw, ScrollText, DollarSign } from 'lucide-react';

export default function UnderwritingDashboard() {
  const { data, isLoading, error } = useDashboard();
  const { data: queueData } = useUwQueue({ status: 'QUEUED' });
  const { data: inProgressData } = useUwQueue({ status: 'IN_PROGRESS' });
  const router = useRouter();

  if (isLoading) return <LoadingState message="Loading underwriting dashboard..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const queueCount = queueData?.meta?.total || 0;
  const inProgressCount = inProgressData?.meta?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Underwriting Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Policy issuance and endorsement processing</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => router.push('/underwriting/queue')}>
          <StatCard label="Queue" value={queueCount} icon={<ClipboardList size={18} />} color="var(--color-accent-amber)" />
        </div>
        <div className="cursor-pointer" onClick={() => router.push('/underwriting/in-progress')}>
          <StatCard label="In Progress" value={inProgressCount} icon={<RefreshCw size={18} />} color="var(--color-accent-cyan)" />
        </div>
        <StatCard label="Active Policies" value={data.activePolicies || 0} icon={<ScrollText size={18} />} color="var(--color-accent-green)" />
        <StatCard label="Total Premium" value={`AED ${(data.totalPremium || 0).toLocaleString()}`} icon={<DollarSign size={18} />} color="var(--color-accent-purple)" />
      </div>
    </div>
  );
}

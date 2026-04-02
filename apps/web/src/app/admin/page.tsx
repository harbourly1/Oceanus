'use client';

import Link from 'next/link';
import { useAdminDashboard } from '@/hooks/use-api';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ROLE_CONFIG, ACTION_COLOR_CONFIG } from '@oceanus/shared';
import {
  Users, TrendingUp, DollarSign, ClipboardList,
  UserCog, ScrollText, ArrowRight,
} from 'lucide-react';

const ROLE_COLORS = ROLE_CONFIG;
const ACTION_COLORS = ACTION_COLOR_CONFIG;

function formatCurrency(n: number) {
  return 'AED ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) return <LoadingState message="Loading admin dashboard..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const d = data || {};
  const totalQueues = (d.uwQueueCount || 0) + (d.approvalQueueCount || 0) + (d.completionQueueCount || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>System overview and administration</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={d.activeUsers || 0} icon={<Users size={16} />} color="var(--color-accent-blue)" />
        <StatCard label="Active Policies" value={d.activePolicies || 0} icon={<TrendingUp size={16} />} color="var(--color-accent-green)" />
        <StatCard label="Total Premium" value={formatCurrency(d.totalPremium || 0)} icon={<DollarSign size={16} />} color="var(--color-accent-amber)" />
        <StatCard label="Pending Queues" value={totalQueues} icon={<ClipboardList size={16} />} color="var(--color-accent-purple)" />
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader title="Users by Role" subtitle="Active user distribution" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(ROLE_COLORS).map(([role, rc]) => (
            <div
              key={role}
              className="rounded-lg p-3 text-center"
              style={{ background: rc.bg }}
            >
              <div className="text-lg font-bold" style={{ color: rc.color }}>
                {d.usersByRole?.[role] || 0}
              </div>
              <div className="text-xs mt-0.5" style={{ color: rc.color }}>
                {rc.label}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users">
          <Card>
            <div className="flex items-center gap-3">
              <UserCog size={24} style={{ color: 'var(--color-accent-blue)' }} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>User Management</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Create, edit, and manage users</p>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </Card>
        </Link>
        <Link href="/admin/activity">
          <Card>
            <div className="flex items-center gap-3">
              <ScrollText size={24} style={{ color: 'var(--color-accent-amber)' }} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Activity Logs</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>View system audit trail</p>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </Card>
        </Link>
        <Link href="/admin/team-mapping">
          <Card>
            <div className="flex items-center gap-3">
              <Users size={24} style={{ color: 'var(--color-accent-green)' }} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Team Mapping</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Assign underwriters to sales execs</p>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </Card>
        </Link>
      </div>

      {/* System Queues */}
      <Card>
        <CardHeader title="System Queues" subtitle="Current pending work items" />
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(245,158,11,0.08)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-amber)' }}>{d.uwQueueCount || 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>UW Queue</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-blue)' }}>{d.approvalQueueCount || 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Approval Queue</div>
          </div>
          <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-green)' }}>{d.completionQueueCount || 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Completion Queue</div>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader
          title="Recent Activity"
          subtitle="Last 10 system-wide actions"
          action={
            <Link href="/admin/activity" className="text-xs font-medium" style={{ color: 'var(--color-accent-blue)' }}>
              View All →
            </Link>
          }
        />
        {(!d.recentActivity || d.recentActivity.length === 0) ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No recent activity</p>
        ) : (
          <div className="space-y-0">
            {d.recentActivity.map((a: any) => {
              const ac = ACTION_COLORS[a.action] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2.5 px-1"
                  style={{ borderBottom: '1px solid var(--color-border-default)' }}
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ color: ac.color, background: ac.bg, minWidth: '80px', textAlign: 'center' }}
                  >
                    {a.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {a.detail || `${a.entityType} ${a.action.toLowerCase()}`}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {a.user?.name}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

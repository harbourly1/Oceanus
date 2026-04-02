'use client';

import { useDashboard, useLeads } from '@/hooks/use-api';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useRouter } from 'next/navigation';
import { LEAD_STATUS_CONFIG, TEMPERATURE_CONFIG } from '@oceanus/shared';
import { Inbox, Users, TrendingUp, DollarSign, ClipboardList, Flame, Thermometer, Snowflake, AlertTriangle, Clock } from 'lucide-react';

export default function SalesDashboard() {
  const { data, isLoading, error } = useDashboard();
  const { data: recentLeads } = useLeads({ limit: '5', sortBy: 'createdAt', sortOrder: 'desc' });
  const router = useRouter();

  if (isLoading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const leads = recentLeads?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Sales Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Overview of leads, customers, and policies</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="cursor-pointer" onClick={() => router.push('/sales/leads')}>
          <StatCard label="Total Leads" value={data.totalLeads || 0} icon={<Inbox size={18} />} color="var(--color-accent-blue)" />
        </div>
        <StatCard label="Customers" value={data.totalCustomers || 0} icon={<Users size={18} />} />
        <StatCard label="Active Policies" value={data.activePolicies || 0} icon={<TrendingUp size={18} />} color="var(--color-accent-green)" />
        <StatCard
          label="Total Premium"
          value={`AED ${(data.totalPremium || 0).toLocaleString()}`}
          icon={<DollarSign size={18} />}
          color="var(--color-accent-amber)"
        />
        <StatCard
          label="Pending Invoices"
          value={data.pendingInvoices || 0}
          icon={<ClipboardList size={18} />}
          color="var(--color-accent-purple)"
        />
      </div>

      {/* Lead Temperature Breakdown */}
      <Card>
        <CardHeader title="Leads by Temperature" subtitle="Lead scoring classification" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'hot', label: 'Hot Leads', icon: <Flame size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
            { key: 'warm', label: 'Warm Leads', icon: <Thermometer size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
            { key: 'cold', label: 'Cold Leads', icon: <Snowflake size={18} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
          ].map(({ key, label, icon, color, bg }) => (
            <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: bg }}>
              <div className="flex-shrink-0" style={{ color }}>{icon}</div>
              <div>
                <div className="text-2xl font-bold" style={{ color }}>{(data.leadsByTemperature as any)?.[key] || 0}</div>
                <div className="text-xs font-medium" style={{ color }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Lead Categories */}
      <Card>
        <CardHeader title="Lead Categories" subtitle="New, renewal, lost, and response metrics" />
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'New Leads', value: (data.leadsByCategory as any)?.new || 0, color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
            { label: 'Renewal', value: (data.leadsByCategory as any)?.renewal || 0, color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
            { label: 'Lost Leads', value: (data.leadsByCategory as any)?.lost || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
            { label: 'LR (Late Response)', value: (data as any).lateResponseCount || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
            { label: 'LLR (Very Late)', value: (data as any).lateLateResponseCount || 0, color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="flex flex-col items-center justify-center px-3 py-3 rounded-lg" style={{ background: bg }}>
              <span className="text-2xl font-bold" style={{ color }}>{value}</span>
              <span className="text-[11px] font-medium text-center mt-1" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Stale Leads Alert */}
      {((data.leadsByCategory as any)?.stale || 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
              {(data.leadsByCategory as any)?.stale} Stale Lead{(data.leadsByCategory as any)?.stale !== 1 ? 's' : ''}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
              No activity in 7+ days — requires attention
            </span>
          </div>
        </div>
      )}

      {/* Leads by Status */}
      <Card>
        <CardHeader title="Leads by Status" subtitle="Current pipeline distribution" />
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(data.leadsByStatus || {}).map(([status, count]) => {
            const config = (LEAD_STATUS_CONFIG as any)[status];
            if (!config) return null;
            return (
              <div key={status} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                style={{ background: config.bg }}
                onClick={() => router.push(`/sales/leads?status=${status}`)}>
                <span className="text-lg font-bold" style={{ color: config.color }}>{count as number}</span>
                <span className="text-xs" style={{ color: config.color }}>{config.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Policies by Product */}
      {Object.keys(data.policiesByProduct || {}).length > 0 && (
        <Card>
          <CardHeader title="Policies by Product" subtitle="Active policy distribution" />
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(data.policiesByProduct || {}).map(([product, count]) => (
              <div key={product} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'var(--color-bg-hover)' }}>
                <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{count as number}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{product}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Leads */}
      <Card>
        <CardHeader title="Recent Leads" subtitle="Latest lead activity"
          action={
            <button className="text-xs hover:underline" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}
              onClick={() => router.push('/sales/leads')}>
              View All &rarr;
            </button>
          }
        />
        <div className="space-y-2">
          {leads.map((lead: any) => {
            const statusCfg = (LEAD_STATUS_CONFIG as any)[lead.status];
            return (
              <div
                key={lead.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
                style={{ border: '1px solid var(--color-border-default)' }}
                onClick={() => router.push(`/sales/leads/${lead.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{lead.fullName}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {lead.ref} &middot; {lead.productType} &middot; {lead.source}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {lead.assignedTo?.name || 'Unassigned'}
                  </span>
                  {statusCfg && <Badge label={statusCfg.label} color={statusCfg.color} bg={statusCfg.bg} />}
                </div>
              </div>
            );
          })}
          {leads.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No leads yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}

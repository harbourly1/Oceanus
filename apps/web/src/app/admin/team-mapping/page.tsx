'use client';

import { useTeamMappings, useAssignUnderwriter } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { User } from 'lucide-react';

export default function TeamMappingPage() {
  const { data, isLoading, error, refetch } = useTeamMappings();
  const assignUnderwriter = useAssignUnderwriter();

  const handleAssign = (salesExecId: string, underwriterId: string) => {
    assignUnderwriter.mutate(
      { salesExecId, underwriterId: underwriterId || null },
      { onError: () => refetch() },
    );
  };

  if (isLoading) return <LoadingState message="Loading team mappings..." />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  const salesAgents = data?.salesAgents || [];
  const underwriters = data?.underwriters || [];

  const uwOptions = [
    { value: '', label: 'Not assigned' },
    ...underwriters.map((uw: any) => ({ value: uw.id, label: `${uw.name} (${uw.role === 'UW_MANAGER' ? 'UW Manager' : 'Underwriter'})` })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Team Mapping</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Assign a dedicated underwriter to each sales executive. When an invoice is approved by accounts,
          the policy will be automatically assigned to the mapped underwriter.
        </p>
      </div>

      {salesAgents.length === 0 ? (
        <EmptyState title="No sales agents" message="No active sales executives found" icon={<User size={32} />} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Sales Executive', 'Role', 'Email', 'Assigned Underwriter', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesAgents.map((agent: any) => (
                  <tr key={agent.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: agent.role === 'SALES_ADMIN' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                                 color: agent.role === 'SALES_ADMIN' ? '#8b5cf6' : '#3b82f6' }}>
                        {agent.role === 'SALES_ADMIN' ? 'Sales Admin' : 'Sales Exec'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{agent.email}</td>
                    <td className="px-4 py-3" style={{ minWidth: '240px' }}>
                      <Select
                        options={uwOptions}
                        value={agent.assignedUnderwriterId || ''}
                        onChange={(e) => handleAssign(agent.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {agent.assignedUnderwriter ? (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                          Mapped
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                          Unmapped
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>How it works</h3>
        <ul className="text-xs space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <li>1. Admin assigns a dedicated underwriter to each sales executive here.</li>
          <li>2. Sales executive creates a lead, converts to customer, creates policy and invoice.</li>
          <li>3. Accountant approves the invoice and confirms payment.</li>
          <li>4. System automatically assigns the policy/endorsement to the mapped underwriter.</li>
          <li>5. Underwriter sees it in their queue with full lead and quote details.</li>
        </ul>
      </Card>
    </div>
  );
}

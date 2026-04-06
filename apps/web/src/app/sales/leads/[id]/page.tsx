'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLeadDetail, useConvertLead, useUpdateLeadStatus, useAssignLead, useUsers, useAllocationLogs, useCustomersByLead, useUpdateLead, useProductConfigMap, useLeadNotes, useAddLeadNote, useDeleteLeadNote, useLeadActivities, useOverrideTemperature, useLeadTasks, useCreateTask, useUpdateTask, useDeleteTask, useRespondToTask } from '@/hooks/use-api';
import { useCurrentUser } from '@/hooks/use-auth';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { Modal } from '@/components/ui/modal';
import {
  LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG, CURRENCY_SYMBOLS, TEMPERATURE_CONFIG,
  getLeadTemperatureWithCategory, getNextLeadStatuses, LeadStatus, UserRole,
  LeadDeclineReason, AllocationMethod,
  TASK_RESPONSE_CONFIG, TaskResponseType, TASK_STATUS_CONFIG,
} from '@oceanus/shared';
import { ProductIcon } from '@/lib/product-icons';
import { FormDataDisplay } from '@/components/ui/form-data-display';
import { FileText, Shuffle, User, Pencil, MessageSquare, Activity, Thermometer, ChevronDown, Trash2, Send, Plus, CheckCircle2, Clock, Calendar } from 'lucide-react';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{value || '-'}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: lead, isLoading, error } = useLeadDetail(id);
  const convertLead = useConvertLead();
  const transitionLead = useUpdateLeadStatus();
  const assignLead = useAssignLead();
  const { data: agentsData } = useUsers('SALES_EXEC');
  const { data: assignmentLogsData } = useAllocationLogs({ leadId: id }, currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_ADMIN');
  const { data: customersData } = useCustomersByLead(id);
  const updateLead = useUpdateLead();
  const productConfigMap = useProductConfigMap();
  const { data: notesData } = useLeadNotes(id);
  const addNote = useAddLeadNote();
  const deleteNote = useDeleteLeadNote();
  const { data: activitiesData } = useLeadActivities(id);
  const overrideTemp = useOverrideTemperature();
  const { data: tasksData } = useLeadTasks(id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTaskMut = useDeleteTask();
  const respondToTask = useRespondToTask();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', assignedToId: '' });
  const [taskFormError, setTaskFormError] = useState('');
  const [responseForm, setResponseForm] = useState({ responseType: '', notes: '', followUpDueDate: '', lostReason: '', transferredToId: '' });
  const [responseFormError, setResponseFormError] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [editLeadModal, setEditLeadModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showTempDropdown, setShowTempDropdown] = useState(false);
  const [tempOverrideReason, setTempOverrideReason] = useState('');
  const [pendingTempValue, setPendingTempValue] = useState<string | null>(null);
  const [showTempReasonModal, setShowTempReasonModal] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState({
    fullName: '', email: '', phone: '', company: '',
    nationality: '', residence: '', contactPref: 'Email',
    currency: 'AED', language: 'en', source: 'web',
  });

  if (isLoading) return <LoadingState message="Loading lead..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!lead) return null;

  const statusCfg = (LEAD_STATUS_CONFIG as any)[lead.status];
  const productCfg = productConfigMap[lead.productType?.toUpperCase()];
  const sourceCfg = (LEAD_SOURCE_CONFIG as any)[lead.source];
  const currencySymbol = (CURRENCY_SYMBOLS as any)[lead.currency] || lead.currency;
  const score = lead.score || 0;
  const leadTasks = tasksData?.data || [];
  const now = new Date();
  const hasOverdueTask = leadTasks.some((t: any) => t.status === 'open' && new Date(t.dueDate) < now);
  const hasVeryOverdueTask = leadTasks.some((t: any) => t.status === 'open' && new Date(t.dueDate) < new Date(now.getTime() - 48 * 60 * 60 * 1000));
  const isStale = !['converted', 'lost'].includes(lead.status) && lead.lastActivityAt && new Date(lead.lastActivityAt) < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const temp = getLeadTemperatureWithCategory({
    status: lead.status,
    score,
    temperatureOverride: lead.temperatureOverride,
    isRenewal: (customersData || []).length > 0,
    hasOverdueTask,
    hasVeryOverdueTask,
    isStale: !!isStale,
  });
  const isManualTemp = !!lead.temperatureOverride;
  const tc = TEMPERATURE_CONFIG[temp];

  // Determine available transitions for current user
  const userRole = (currentUser?.role || 'SALES_EXEC') as UserRole;
  const nextStatuses = getNextLeadStatuses(lead.status as LeadStatus, userRole);

  // Parse JSON fields safely
  let formData: Record<string, any> = {};
  try { formData = JSON.parse(lead.formData || '{}'); } catch { /* empty */ }

  let quotesData: any[] = [];
  try { quotesData = JSON.parse(lead.quotesData || '[]'); } catch { /* empty */ }

  let selectedQuote: any = null;
  try { selectedQuote = lead.selectedQuote ? JSON.parse(lead.selectedQuote) : null; } catch { /* empty */ }

  const customers = customersData || [];
  const canConvert = ['quoted', 'selected'].includes(lead.status) && customers.length === 0;

  const canEditLead = !!currentUser && ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'].includes(currentUser.role);

  const openEditLead = () => {
    setLeadEditForm({
      fullName: lead.fullName || '', email: lead.email || '',
      phone: lead.phone || '', company: lead.company || '',
      nationality: lead.nationality || '', residence: lead.residence || '',
      contactPref: lead.contactPref || 'Email', currency: lead.currency || 'AED',
      language: lead.language || 'en', source: lead.source || 'web',
    });
    setEditLeadModal(true);
  };

  const handleSaveLead = async () => {
    try {
      await updateLead.mutateAsync({ id: lead.id, ...leadEditForm });
      setEditLeadModal(false);
    } catch (e: any) {
      alert(e?.message || 'Failed to update lead');
    }
  };

  const handleConvert = async () => {
    try {
      const customer = await convertLead.mutateAsync(lead.id) as any;
      router.push(`/customers/${customer.id}`);
    } catch {
      // error handled by mutation
    }
  };

  const handleTransition = (status: string) => {
    if (status === 'lost' || status === 'disqualified') {
      setPendingStatus(status);
      setShowDeclineModal(true);
      return;
    }
    transitionLead.mutate({ id: lead.id, status });
  };

  const handleDeclineSubmit = () => {
    if (!pendingStatus || !declineReason) return;
    transitionLead.mutate({
      id: lead.id,
      status: pendingStatus,
      note: statusNote || undefined,
      declineReason,
    });
    setShowDeclineModal(false);
    setPendingStatus(null);
    setDeclineReason('');
    setStatusNote('');
  };

  const handleAssign = (userId: string) => {
    if (userId) assignLead.mutate({ id: lead.id, assignedToId: userId });
  };

  const agents = agentsData?.data || agentsData || [];
  const assignmentLogs = assignmentLogsData?.data || [];

  // Get most recent assignment method for badge display
  const latestAssignmentMethod = assignmentLogs.length > 0 ? assignmentLogs[0]?.method : null;

  const DECLINE_REASONS = Object.values(LeadDeclineReason).map((v) => ({
    value: v,
    label: v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
  }));

  const notes = notesData || [];
  const activities = activitiesData?.data || [];

  // Merge notes and activities into a unified timeline
  const timeline = [
    ...notes.map((n: any) => ({ type: 'note' as const, id: n.id, content: n.content, user: n.createdBy, createdAt: n.createdAt, createdById: n.createdById })),
    ...activities.map((a: any) => ({ type: 'activity' as const, id: a.id, content: a.detail || a.action, user: a.user, createdAt: a.createdAt, action: a.action })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ leadId: id, content: noteText.trim() });
    setNoteText('');
  };

  const handleTempOverrideSubmit = () => {
    overrideTemp.mutate({ leadId: id, temperature: pendingTempValue, reason: tempOverrideReason || undefined });
    setShowTempReasonModal(false);
    setPendingTempValue(null);
    setTempOverrideReason('');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: leadTasks.length },
    { id: 'notes', label: 'Notes & Activity', count: timeline.length },
    { id: 'customers', label: 'Customer IDs', count: customers.length },
    { id: 'quotes', label: 'Quotes', count: quotesData.length },
    { id: 'documents', label: 'Documents', count: lead.documents?.length || 0 },
    { id: 'history', label: 'Assignment History', count: assignmentLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ProductIcon iconKey={productCfg?.iconKey} size={24} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {lead.fullName}
              </h1>
              {statusCfg && <StatusBadge status={lead.status} config={statusCfg} />}
              <div className="relative">
                <button
                  onClick={() => canEditLead && setShowTempDropdown(!showTempDropdown)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: tc.color, background: `${tc.color}18` }}
                >
                  {tc.label} ({score}){isManualTemp ? ' *' : ''}
                  {canEditLead && <ChevronDown size={10} />}
                </button>
                {showTempDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[140px]"
                    style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
                    {(['hot', 'warm', 'cold'] as const).map((t) => (
                      <button key={t} onClick={() => {
                        setPendingTempValue(t);
                        setShowTempDropdown(false);
                        setTempOverrideReason('');
                        setShowTempReasonModal(true);
                      }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ color: TEMPERATURE_CONFIG[t].color }}>
                        {TEMPERATURE_CONFIG[t].label}{temp === t ? ' (current)' : ''}
                      </button>
                    ))}
                    {isManualTemp && (
                      <>
                        <div className="my-1" style={{ borderTop: '1px solid var(--color-border-default)' }} />
                        <button onClick={() => {
                          setPendingTempValue(null);
                          setShowTempDropdown(false);
                          setTempOverrideReason('');
                          setShowTempReasonModal(true);
                        }}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-secondary)' }}>
                          Reset to Auto
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {lead.ref} &middot; {productCfg?.label || lead.productType} &middot; {sourceCfg?.label || lead.source} &middot; {new Date(lead.createdAt).toLocaleDateString()}
              {lead.assignedTo && <> &middot; Assigned to {lead.assignedTo.name}</>}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {customers.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/customers/${customers[0].id}`)}
            >
              View Customer &rarr;
            </Button>
          )}
          {canConvert && (
            <Button
              size="sm"
              onClick={handleConvert}
              loading={convertLead.isPending}
            >
              Convert to Customer ID
            </Button>
          )}
        </div>
      </div>

      {/* Transition Buttons */}
      {nextStatuses.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Move to:</span>
          {nextStatuses.map((status) => {
            const cfg = (LEAD_STATUS_CONFIG as any)[status];
            return (
              <button
                key={status}
                onClick={() => handleTransition(status)}
                disabled={transitionLead.isPending}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: cfg?.bg || 'var(--color-bg-hover)', color: cfg?.color || 'var(--color-text-secondary)', border: `1px solid ${cfg?.color || 'var(--color-border-default)'}30` }}
              >
                {cfg?.label || status}
              </button>
            );
          })}
        </div>
      )}

      {/* Assignment */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_ADMIN') && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Assign to:</span>
          <select
            value={lead.assignedToId || ''}
            onChange={(e) => handleAssign(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
          >
            <option value="">Unassigned</option>
            {Array.isArray(agents) && agents.map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          {latestAssignmentMethod && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: latestAssignmentMethod === AllocationMethod.ROUND_ROBIN ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)',
                color: latestAssignmentMethod === AllocationMethod.ROUND_ROBIN ? 'var(--color-accent-blue)' : '#6b7280',
              }}
            >
              {latestAssignmentMethod === AllocationMethod.ROUND_ROBIN ? 'Auto-assigned' : 'Manual'}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Lead Information" />
              <div className="space-y-0.5">
                <Row label="Product" value={productCfg?.label || lead.productType} />
                <Row label="Currency" value={lead.currency} />
                <Row label="Source" value={sourceCfg?.label || lead.source} />
                <Row label="Status" value={statusCfg?.label || lead.status} />
                <Row label="Score" value={`${score} (${tc.label})`} />
                {lead.assignedTo && <Row label="Assigned To" value={lead.assignedTo.name} />}
                {lead.declineReason && <Row label="Decline Reason" value={lead.declineReason.replace(/_/g, ' ')} />}
                {lead.statusNote && <Row label="Status Note" value={lead.statusNote} />}
                {lead.lastActivityAt && <Row label="Last Activity" value={new Date(lead.lastActivityAt).toLocaleString()} />}
                <Row label="Created" value={new Date(lead.createdAt).toLocaleString()} />
                <Row label="Updated" value={new Date(lead.updatedAt).toLocaleString()} />
              </div>
            </Card>

            <Card>
              <CardHeader title="Contact Details" action={
                canEditLead ? (
                  <button onClick={openEditLead}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-accent-blue, #3b82f6)', background: 'rgba(59,130,246,0.08)' }}>
                    <Pencil size={12} /> Edit
                  </button>
                ) : undefined
              } />
              <div className="space-y-0.5">
                <Row label="Full Name" value={lead.fullName} />
                <Row label="Email" value={lead.email} />
                <Row label="Phone" value={lead.phone || '-'} />
                <Row label="Company" value={lead.company || '-'} />
                <Row label="Nationality" value={lead.nationality || '-'} />
                <Row label="Residence" value={lead.residence || '-'} />
                <Row label="Contact Pref" value={lead.contactPref} />
              </div>
            </Card>
          </div>

          {/* Form Data */}
          <Card>
            <CardHeader title="Form Data" subtitle="Product-specific details submitted by the customer" />
            <FormDataDisplay productType={lead.productType} formData={formData} variant="card" />
          </Card>

          {/* Lost Lead Information */}
          {lead.status === 'lost' && (
            <Card>
              <CardHeader title="Lost Lead Information" />
              <div className="space-y-0.5">
                <Row label="Lost Date" value={lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : '-'} />
                <Row label="Lost Reason" value={lead.declineReason ? lead.declineReason.replace(/_/g, ' ') : '-'} />
                <Row label="Last Activity" value={lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString() : '-'} />
                <Row label="Sales Notes" value={lead.statusNote || '-'} />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (() => {
        const openTask = leadTasks.find((t: any) => t.status === 'open');
        const isTerminalResponse = responseForm.responseType === 'lost_lead' || responseForm.responseType === 'redundant_lead' || responseForm.responseType === 'transferred';

        const DECLINE_REASONS_LIST = Object.values(LeadDeclineReason).map((v) => ({
          value: v,
          label: v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        }));

        const handleRespond = () => {
          if (!responseForm.responseType) { setResponseFormError('Response is required'); return; }
          if (responseForm.responseType === 'lost_lead' && !responseForm.lostReason) { setResponseFormError('Lost lead reason is required'); return; }
          if (responseForm.responseType === 'transferred' && !responseForm.transferredToId) { setResponseFormError('Transfer target agent is required'); return; }
          if (!isTerminalResponse && !responseForm.followUpDueDate) { setResponseFormError('Follow up date is required'); return; }
          respondToTask.mutate({
            leadId: id,
            taskId: openTask!.id,
            responseType: responseForm.responseType,
            notes: responseForm.notes.trim() || undefined,
            followUpDueDate: responseForm.followUpDueDate ? new Date(responseForm.followUpDueDate).toISOString() : undefined,
            lostReason: responseForm.lostReason || undefined,
            transferredToId: responseForm.transferredToId || undefined,
          }, {
            onSuccess: () => {
              setResponseForm({ responseType: '', notes: '', followUpDueDate: '', lostReason: '', transferredToId: '' });
              setResponseFormError('');
            },
            onError: (err: any) => setResponseFormError(err?.message || 'Failed to respond'),
          });
        };

        return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Tasks ({leadTasks.length})
            </h3>
            <div className="flex gap-2">
              {!['converted', 'lost'].includes(lead.status) && (
              <Button size="sm" onClick={() => {
                setTaskForm({ title: '', description: '', dueDate: '', assignedToId: lead.assignedToId || '' });
                setTaskFormError('');
                setShowCreateTask(true);
              }}>
                <Plus size={14} className="mr-1" /> Add Task
              </Button>
              )}
            </div>
          </div>

          {leadTasks.length === 0 ? (
            <EmptyState title="No tasks yet" message="Create a task to track follow-ups and deadlines for this lead." />
          ) : (
            <>
              {/* Task History Table */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                        {['Lead Status', 'Task Response', 'Due At', 'Request Timeline', 'Status'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leadTasks.map((task: any) => {
                        const isOverdue = task.status === 'open' && new Date(task.dueDate) < new Date();
                        const statusKey = isOverdue ? 'overdue' : task.status;
                        const statusCfgTask = (TASK_STATUS_CONFIG as any)[statusKey];
                        const responseCfg = task.responseType ? (TASK_RESPONSE_CONFIG as any)[task.responseType] : null;
                        return (
                          <tr key={task.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                            <td className="px-3 py-2.5">
                              {statusCfg && <StatusBadge status={lead.status} config={statusCfg} />}
                            </td>
                            <td className="px-3 py-2.5">
                              {responseCfg ? (
                                <Badge label={responseCfg.label} color={responseCfg.color} bg={responseCfg.bg} />
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#9ca3af', background: 'rgba(156,163,175,0.12)' }}>Pending</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2.5">
                              {statusCfgTask && <Badge label={statusCfgTask.label} color={statusCfgTask.color} bg={statusCfgTask.bg} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Inline Response Form — only for the open task */}
              {openTask && (
                <Card>
                  <CardHeader title="Enter Task Details" subtitle={`For: "${openTask.title}" (due ${new Date(openTask.dueDate).toLocaleDateString()} ${new Date(openTask.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`} />
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Response From Customer */}
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                          Response From Customer <span style={{ color: 'var(--color-accent-red)' }}>*</span>
                        </label>
                        <select
                          value={responseForm.responseType}
                          onChange={(e) => { setResponseForm(f => ({ ...f, responseType: e.target.value, lostReason: '', transferredToId: '' })); setResponseFormError(''); }}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                        >
                          <option value="">Please select response</option>
                          {Object.values(TaskResponseType).map((rt) => {
                            const cfg = (TASK_RESPONSE_CONFIG as any)[rt];
                            return <option key={rt} value={rt}>{cfg?.label || rt}</option>;
                          })}
                        </select>
                      </div>

                      {/* Lost Lead Reason — conditional */}
                      {responseForm.responseType === 'lost_lead' && (
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Lost Lead Reason <span style={{ color: 'var(--color-accent-red)' }}>*</span>
                          </label>
                          <select
                            value={responseForm.lostReason}
                            onChange={(e) => { setResponseForm(f => ({ ...f, lostReason: e.target.value })); setResponseFormError(''); }}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                          >
                            <option value="">Please select lost reason</option>
                            {DECLINE_REASONS_LIST.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Transfer To Agent — conditional */}
                      {responseForm.responseType === 'transferred' && (
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Transfer To <span style={{ color: 'var(--color-accent-red)' }}>*</span>
                          </label>
                          <select
                            value={responseForm.transferredToId}
                            onChange={(e) => { setResponseForm(f => ({ ...f, transferredToId: e.target.value })); setResponseFormError(''); }}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                          >
                            <option value="">Select agent to transfer to...</option>
                            {agents.filter((a: any) => a.id !== lead.assignedToId).map((a: any) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Follow Up Due Date & Time — hidden for terminal responses */}
                      {!isTerminalResponse && (
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Follow Up Due Date & Time <span style={{ color: 'var(--color-accent-red)' }}>*</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={responseForm.followUpDueDate}
                            onChange={(e) => { setResponseForm(f => ({ ...f, followUpDueDate: e.target.value })); setResponseFormError(''); }}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                      <textarea
                        value={responseForm.notes}
                        onChange={(e) => setResponseForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                        style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                        rows={3}
                        placeholder="Additional notes..."
                      />
                    </div>

                    {responseFormError && (
                      <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--color-accent-red)', background: 'rgba(239,68,68,0.08)' }}>
                        {responseFormError}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button size="sm" loading={respondToTask.isPending} onClick={handleRespond}>
                        Save
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Create Task Modal */}
          <Modal open={showCreateTask} onClose={() => setShowCreateTask(false)} title="Create Task" width="480px">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  placeholder="e.g. Follow-up call, Send quote"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  rows={3}
                  placeholder="Task details (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Due Date *</label>
                  <input
                    type="datetime-local"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Assign To *</label>
                  <select
                    value={taskForm.assignedToId}
                    onChange={(e) => setTaskForm(f => ({ ...f, assignedToId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">Select agent...</option>
                    {Array.isArray(agents) && agents.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {taskFormError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--color-accent-red)', background: 'rgba(239,68,68,0.08)' }}>
                  {taskFormError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowCreateTask(false)}>Cancel</Button>
                <Button size="sm" loading={createTask.isPending} onClick={() => {
                  if (!taskForm.title.trim()) { setTaskFormError('Title is required'); return; }
                  if (!taskForm.dueDate) { setTaskFormError('Due date is required'); return; }
                  if (!taskForm.assignedToId) { setTaskFormError('Assign to is required'); return; }
                  createTask.mutate({
                    leadId: id,
                    title: taskForm.title.trim(),
                    description: taskForm.description.trim() || undefined,
                    dueDate: new Date(taskForm.dueDate).toISOString(),
                    assignedToId: taskForm.assignedToId,
                  }, {
                    onSuccess: () => setShowCreateTask(false),
                    onError: (err: any) => setTaskFormError(err?.message || 'Failed to create task'),
                  });
                }}>
                  Create Task
                </Button>
              </div>
            </div>
          </Modal>
        </div>
        );
      })()}

      {/* Notes & Activity Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note Input */}
          {canEditLead && (
            <Card>
              <div className="flex gap-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm px-3 py-2 rounded-lg resize-none"
                  style={{ background: 'var(--color-bg-main)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  placeholder="Add a note about this lead..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                />
                <Button size="sm" onClick={handleAddNote} loading={addNote.isPending} disabled={!noteText.trim()}>
                  <Send size={14} />
                </Button>
              </div>
            </Card>
          )}

          {/* Timeline */}
          {timeline.length === 0 ? (
            <EmptyState title="No Activity Yet" message="No notes or activity recorded for this lead" />
          ) : (
            <Card>
              <CardHeader title="Timeline" subtitle={`${timeline.length} entries`} />
              <div className="space-y-3">
                {timeline.map((entry) => {
                  const isNote = entry.type === 'note';
                  const actionIcons: Record<string, typeof Activity> = {
                    STATUS_CHANGE: Activity,
                    ASSIGNED: Shuffle,
                    CONVERTED: User,
                    EDITED: Pencil,
                    TEMPERATURE_OVERRIDE: Thermometer,
                    NOTE_ADDED: MessageSquare,
                    NOTE_DELETED: Trash2,
                  };
                  const IconComp = isNote ? MessageSquare : (actionIcons[(entry as any).action] || Activity);
                  const iconColor = isNote ? 'var(--color-accent-blue)' : '#6b7280';
                  const iconBg = isNote ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)';

                  return (
                    <div
                      key={`${entry.type}-${entry.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: iconBg, color: iconColor }}
                      >
                        <IconComp size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {entry.user?.name || 'System'}
                          </span>
                          {entry.user?.role && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                              {entry.user.role.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: isNote ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.08)', color: isNote ? 'var(--color-accent-blue)' : '#9ca3af' }}>
                            {isNote ? 'Note' : ((entry as any).action || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {entry.content || '-'}
                        </p>
                        <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {isNote && currentUser && (entry.createdById === currentUser.id || currentUser.role === 'ADMIN') && (
                        <button
                          onClick={() => deleteNote.mutate({ leadId: id, noteId: entry.id })}
                          className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Customer IDs Tab */}
      {activeTab === 'customers' && (
        <div>
          {customers.length === 0 ? (
            <EmptyState title="No Customer IDs" message="No Customer IDs have been created from this lead yet" />
          ) : (
            <Card>
              <CardHeader title="Customer IDs Under This Lead" subtitle={`${customers.length} customer ID(s)`} />
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      {['Customer ID', 'Customer Name', 'Policies', 'Endorsements', 'Invoices', 'Created Date', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c: any) => (
                      <tr key={c.id} className="cursor-pointer hover:opacity-80" style={{ borderBottom: '1px solid var(--color-border-default)' }}
                        onClick={() => router.push(`/customers/${c.id}`)}>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>{c.ref}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>{c.customerName}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c._count?.policies || 0}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c._count?.endorsements || 0}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{c._count?.invoices || 0}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>&rarr;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Quotes Tab */}
      {activeTab === 'quotes' && (
        <div>
          {quotesData.length === 0 ? (
            <EmptyState title="No Quotes" message="No quotes generated for this lead" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quotesData.map((quote: any, idx: number) => {
                const isSelected = selectedQuote && (
                  selectedQuote.insurer === quote.insurer ||
                  selectedQuote.id === quote.id
                );
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl transition-all"
                    style={{
                      border: isSelected ? '2px solid var(--color-accent-green)' : '1px solid var(--color-border-default)',
                      background: isSelected ? 'rgba(16,185,129,0.05)' : 'var(--color-bg-card)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {quote.insurer}
                        </span>
                        {isSelected && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-accent-green)' }}>
                            Selected
                          </span>
                        )}
                      </div>
                      {quote.score != null && (
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          Score: {quote.score}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Premium</span>
                        <div className="text-sm font-bold" style={{ color: 'var(--color-accent-green)' }}>
                          {currencySymbol} {Number(quote.premium || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Rate</span>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {quote.rate ? `${(quote.rate * 100).toFixed(3)}%` : '-'}
                        </div>
                      </div>
                    </div>

                    {quote.inclusions && quote.inclusions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {quote.inclusions.map((inc: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}
                          >
                            {inc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {(!lead.documents || lead.documents.length === 0) ? (
            <EmptyState title="No Documents" message="No documents uploaded for this lead" />
          ) : (
            <Card>
              <div className="space-y-2">
                {lead.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ border: '1px solid var(--color-border-default)' }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} style={{ color: 'var(--color-text-muted)' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{doc.originalName}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {doc.mimeType} &middot; {(doc.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Assignment History Tab */}
      {activeTab === 'history' && (
        <div>
          {assignmentLogs.length === 0 ? (
            <EmptyState title="No Assignment History" message="No assignment records found for this lead" />
          ) : (
            <Card>
              <CardHeader title="Assignment Timeline" subtitle="History of all assignments for this lead" />
              <div className="space-y-3">
                {assignmentLogs.map((log: any, idx: number) => (
                  <div
                    key={log.id || idx}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{
                        background: log.method === AllocationMethod.ROUND_ROBIN ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)',
                        color: log.method === AllocationMethod.ROUND_ROBIN ? 'var(--color-accent-blue)' : '#6b7280',
                      }}
                    >
                      {log.method === AllocationMethod.ROUND_ROBIN ? <Shuffle size={16} /> : <User size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          Assigned to {log.assignedTo?.name || 'Unknown'}
                        </span>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: log.method === AllocationMethod.ROUND_ROBIN ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)',
                            color: log.method === AllocationMethod.ROUND_ROBIN ? 'var(--color-accent-blue)' : '#6b7280',
                          }}
                        >
                          {log.method === AllocationMethod.ROUND_ROBIN ? 'Round Robin' : 'Manual'}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                        {log.assignedBy && <> &middot; by {log.assignedBy.name}</>}
                        {log.pool && <> &middot; via {log.pool.name}</>}
                      </div>
                      {log.reason && (
                        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6 rounded-xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Mark as {pendingStatus === 'lost' ? 'Lost' : 'Disqualified'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Reason *</label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg-main)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">Select a reason...</option>
                  {DECLINE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Note (optional)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-lg resize-none"
                  style={{ background: 'var(--color-bg-main)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  placeholder="Additional context..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" size="sm" onClick={() => { setShowDeclineModal(false); setPendingStatus(null); setDeclineReason(''); setStatusNote(''); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleDeclineSubmit} disabled={!declineReason}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      <Modal open={editLeadModal} onClose={() => setEditLeadModal(false)} title="Edit Lead Contact Details" width="540px">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'fullName', label: 'Full Name *', type: 'text' },
              { key: 'email', label: 'Email *', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'text' },
              { key: 'company', label: 'Company', type: 'text' },
              { key: 'nationality', label: 'Nationality', type: 'text' },
              { key: 'residence', label: 'Residence', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input type={f.type} className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                  value={(leadEditForm as any)[f.key]}
                  onChange={ev => setLeadEditForm(prev => ({ ...prev, [f.key]: ev.target.value }))} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Contact Pref</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={leadEditForm.contactPref}
                onChange={ev => setLeadEditForm(prev => ({ ...prev, contactPref: ev.target.value }))}>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Source</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={leadEditForm.source}
                onChange={ev => setLeadEditForm(prev => ({ ...prev, source: ev.target.value }))}>
                <option value="web">Web</option>
                <option value="phone">Phone</option>
                <option value="referral">Referral</option>
                <option value="broker">Broker</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Currency</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={leadEditForm.currency}
                onChange={ev => setLeadEditForm(prev => ({ ...prev, currency: ev.target.value }))}>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Language</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                value={leadEditForm.language}
                onChange={ev => setLeadEditForm(prev => ({ ...prev, language: ev.target.value }))}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditLeadModal(false)}>Cancel</Button>
            <Button size="sm" loading={updateLead.isPending} onClick={handleSaveLead}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Temperature Override Reason Modal */}
      {showTempReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowTempReasonModal(false)}>
          <div className="w-full max-w-sm p-6 rounded-xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {pendingTempValue ? `Set Temperature to ${pendingTempValue.toUpperCase()}` : 'Reset to Auto Temperature'}
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {pendingTempValue
                ? `Override the current temperature (${temp.toUpperCase()}) with a manual value.`
                : `Revert to the auto-calculated temperature.`}
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Reason (optional)</label>
              <textarea
                value={tempOverrideReason}
                onChange={(e) => setTempOverrideReason(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-lg resize-none"
                style={{ background: 'var(--color-bg-main)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                placeholder="e.g., Spoke with client, very interested in hull coverage..."
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowTempReasonModal(false); setPendingTempValue(null); setTempOverrideReason(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTempOverrideSubmit} loading={overrideTemp.isPending}>
                {pendingTempValue ? 'Set Temperature' : 'Reset to Auto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

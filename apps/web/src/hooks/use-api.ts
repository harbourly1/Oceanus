'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToken } from './use-auth';
import { PRODUCT_CONFIG } from '@oceanus/shared';

// ─── Leads ───────────────────────────────────────────────────────────────────

export function useLeads(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.get<any>(`/leads?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useLeadDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<any>(`/leads/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useLeadStats() {
  const token = useToken();
  return useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => api.get<any>('/leads/stats', { token }),
    enabled: !!token,
  });
}

export function useUpdateLeadStatus() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note, declineReason }: { id: string; status: string; note?: string; declineReason?: string }) =>
      api.patch(`/leads/${id}/status`, { status, note, declineReason }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead', vars.id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useAssignLead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      api.post(`/leads/${id}/assign`, { assignedToId }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead', vars.id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useCreateLead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productType: string;
      fullName: string;
      email: string;
      phone?: string;
      company?: string;
      nationality?: string;
      residence?: string;
      contactPref?: string;
      currency?: string;
      source: string;
      language?: string;
      formData?: Record<string, any>;
    }) => api.post('/leads/portal', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useConvertLead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`, {}, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

export function useUpdateLead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.patch(`/leads/${id}`, data, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead', vars.id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

// ─── Lead Notes ──────────────────────────────────────────────────────────────

export function useLeadNotes(leadId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: () => api.get<any[]>(`/leads/${leadId}/notes`, { token }),
    enabled: !!token && !!leadId,
  });
}

export function useAddLeadNote() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
      api.post(`/leads/${leadId}/notes`, { content }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-notes', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['lead-activities', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['lead', vars.leadId] });
    },
  });
}

export function useDeleteLeadNote() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, noteId }: { leadId: string; noteId: string }) =>
      api.delete(`/leads/${leadId}/notes/${noteId}`, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-notes', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['lead-activities', vars.leadId] });
    },
  });
}

// ─── Lead Activities ─────────────────────────────────────────────────────────

export function useLeadActivities(leadId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => api.get<any>(`/leads/${leadId}/activities`, { token }),
    enabled: !!token && !!leadId,
  });
}

// ─── Temperature Override ────────────────────────────────────────────────────

export function useOverrideTemperature() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, temperature, reason }: { leadId: string; temperature: string | null; reason?: string }) =>
      api.patch(`/leads/${leadId}/temperature`, { temperature, reason }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', vars.leadId] });
    },
  });
}

// ─── Lead Tasks ──────────────────────────────────────────────────────────────

export function useLeadTasks(leadId: string, params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['lead-tasks', leadId, searchParams],
    queryFn: () => api.get<any>(`/leads/${leadId}/tasks?${searchParams}`, { token }),
    enabled: !!leadId,
  });
}

export function useLeadTasksList(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['lead-tasks-list', searchParams],
    queryFn: () => api.get<any>(`/leads/tasks?${searchParams}`, { token }),
  });
}

export function useLeadTaskStats(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['lead-task-stats', searchParams],
    queryFn: () => api.get<any>(`/leads/tasks/stats?${searchParams}`, { token }),
  });
}

export function useCreateTask() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...data }: { leadId: string; title: string; description?: string; dueDate: string; assignedToId: string }) =>
      api.post(`/leads/${leadId}/tasks`, data, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-tasks', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['lead-tasks-list'] });
      qc.invalidateQueries({ queryKey: ['lead-task-stats'] });
    },
  });
}

export function useUpdateTask() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...data }: { taskId: string; title?: string; description?: string; dueDate?: string; assignedToId?: string; status?: string }) =>
      api.patch(`/leads/tasks/${taskId}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks'] });
      qc.invalidateQueries({ queryKey: ['lead-tasks-list'] });
      qc.invalidateQueries({ queryKey: ['lead-task-stats'] });
    },
  });
}

export function useDeleteTask() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      api.delete(`/leads/tasks/${taskId}`, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks'] });
      qc.invalidateQueries({ queryKey: ['lead-tasks-list'] });
      qc.invalidateQueries({ queryKey: ['lead-task-stats'] });
    },
  });
}

export function useRespondToTask() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, taskId, ...data }: { leadId: string; taskId: string; responseType: string; notes?: string; followUpDueDate?: string; lostReason?: string; transferredToId?: string }) =>
      api.post(`/leads/${leadId}/tasks/${taskId}/respond`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks'] });
      qc.invalidateQueries({ queryKey: ['lead-tasks-list'] });
      qc.invalidateQueries({ queryKey: ['lead-task-stats'] });
      qc.invalidateQueries({ queryKey: ['lead'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
    },
  });
}

// ─── Customers ───────────────────────────────────────────────────────────────

export function useCustomers(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.get<any>(`/customers?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useCustomerDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<any>(`/customers/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useCustomersByLead(leadId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['customers-by-lead', leadId],
    queryFn: () => api.get<any>(`/customers/by-lead/${leadId}`, { token }),
    enabled: !!token && !!leadId,
  });
}

export function useCreateCustomer() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { leadId: string }) => api.post('/customers', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers-by-lead'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateCustomer() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.patch(`/customers/${id}`, data, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['customer', vars.id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ─── Policies ────────────────────────────────────────────────────────────────

export function usePolicies(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['policies', params],
    queryFn: () => api.get<any>(`/policies?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function usePolicyDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => api.get<any>(`/policies/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useCreatePolicy() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerIdId: string;
      insurer: string;
      product: string;
      premium: number;
      sumInsured: number;
      commission?: number;
      commissionRate?: number;
      startDate: string;
      endDate: string;
    }) => api.post('/policies', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdatePolicyStatus() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, policyDocument }: { id: string; status: string; policyDocument?: string }) =>
      api.patch(`/policies/${id}/status`, { status, policyDocument }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['policy', vars.id] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useUpdatePolicy() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.patch(`/policies/${id}`, data, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['policy', vars.id] });
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ─── Endorsements ────────────────────────────────────────────────────────────

export function useEndorsements(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['endorsements', params],
    queryFn: () => api.get<any>(`/endorsements?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useEndorsementDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['endorsement', id],
    queryFn: () => api.get<any>(`/endorsements/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useEndorsementsByPolicy(policyId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['endorsements-by-policy', policyId],
    queryFn: () => api.get<any>(`/endorsements/by-policy/${policyId}`, { token }),
    enabled: !!token && !!policyId,
  });
}

export function useCreateEndorsement() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      policyId: string;
      type: string;
      details?: string;
      effectiveDate?: string;
      reason?: string;
      financialImpact?: number;
    }) => api.post('/endorsements', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['endorsements'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateEndorsementStatus() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/endorsements/${id}/status`, { status }, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['endorsement', vars.id] });
      qc.invalidateQueries({ queryKey: ['endorsements'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useUpdateEndorsement() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.patch(`/endorsements/${id}`, data, { token }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['endorsement', vars.id] });
      qc.invalidateQueries({ queryKey: ['endorsements'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => api.get<any>(`/invoices?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useInvoiceDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<any>(`/invoices/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useCreateInvoice() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerIdId: string;
      policyId?: string;
      endorsementId?: string;
      type: string;
      amount: number;
      receiptAmount?: number;
      paymentDate?: string;
      paymentMode?: string;
      installment?: boolean;
      installmentDetails?: string;
      receiptPath?: string;
      currency?: string;
      dueDate: string;
      policyPurchaseType?: string;
      notes?: string;
    }) => api.post('/invoices', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useApproveInvoice() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(`/invoices/${id}/approve`, { notes }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['accounts-queue'] });
    },
  });
}

export function useDeclineInvoice() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      api.patch(`/invoices/${id}/decline`, { remarks }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['accounts-queue'] });
    },
  });
}

// ─── Accounts Queue ──────────────────────────────────────────────────────────

export function useApprovalQueue(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return useQuery({
    queryKey: ['accounts-queue', 'approval', params],
    queryFn: () => api.get<any>(`/accounts-queue/approval${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useCompletionQueue(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return useQuery({
    queryKey: ['accounts-queue', 'completion', params],
    queryFn: () => api.get<any>(`/accounts-queue/completion${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useAccountsQueueStats() {
  const token = useToken();
  return useQuery({
    queryKey: ['accounts-queue', 'stats'],
    queryFn: () => api.get<any>('/accounts-queue/stats', { token }),
    enabled: !!token,
  });
}

export function useProcessQueueItem() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes?: string }) =>
      api.patch(`/accounts-queue/${id}/process`, { action, notes }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-queue'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['endorsements'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

// ─── UW Assignments ──────────────────────────────────────────────────────────

export function useUwQueue(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return useQuery({
    queryKey: ['uw-queue', params],
    queryFn: () => api.get<any>(`/uw-assignments/queue${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useUwAssignmentDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['uw-assignment', id],
    queryFn: () => api.get<any>(`/uw-assignments/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useCreateUwAssignment() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { policyId?: string; endorsementId?: string; underwriterId: string; notes?: string }) =>
      api.post('/uw-assignments', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uw-queue'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['endorsements'] });
    },
  });
}

export function useStartUwReview() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/uw-assignments/${id}/start`, {}, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uw-queue'] }),
  });
}

export function useCompleteUwAssignment() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/uw-assignments/${id}/complete`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uw-queue'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
      qc.invalidateQueries({ queryKey: ['endorsements'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useReturnUwAssignment() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(`/uw-assignments/${id}/return`, { notes }, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uw-queue'] }),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  const token = useToken();
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<any>('/reports/dashboard', { token }),
    enabled: !!token,
  });
}

export function useMasterReport(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return useQuery({
    queryKey: ['master-report', params],
    queryFn: () => api.get<any>(`/reports/master${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useProductionReport(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return useQuery({
    queryKey: ['production-report', params],
    queryFn: () => api.get<any>(`/reports/production${searchParams}`, { token }),
    enabled: !!token,
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function useUsers(role?: string) {
  const token = useToken();
  const params = role ? `?role=${role}` : '';
  return useQuery({
    queryKey: ['users', role],
    queryFn: () => api.get<any>(`/users${params}`, { token }),
    enabled: !!token,
  });
}

export function useUnderwriters() {
  const token = useToken();
  return useQuery({
    queryKey: ['underwriters'],
    queryFn: () => api.get<any>('/users/underwriters', { token }),
    enabled: !!token,
  });
}

export function useUpdateUserLeave() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isOnLeave }: { userId: string; isOnLeave: boolean }) =>
      api.patch<any>(`/users/${userId}/leave`, { isOnLeave }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['allocation-pools'] });
    },
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function useNotifications(unreadOnly?: boolean) {
  const token = useToken();
  const params = unreadOnly ? '?unreadOnly=true' : '';
  return useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: () => api.get<any>(`/notifications${params}`, { token }),
    enabled: !!token,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Allocation ──────────────────────────────────────────────────────────────

export function useAllocationPools() {
  const token = useToken();
  return useQuery({
    queryKey: ['allocation-pools'],
    queryFn: () => api.get<any>('/allocation/pools', { token }),
    enabled: !!token,
  });
}

export function useAllocationPool(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['allocation-pool', id],
    queryFn: () => api.get<any>(`/allocation/pools/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useCreateAllocationPool() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; productTypes: string[]; languages?: string[]; maxDailyLeads?: number; maxWeeklyLeads?: number; agentIds: string[] }) =>
      api.post<any>('/allocation/pools', data, { token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocation-pools'] }); },
  });
}

export function useUpdateAllocationPool() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; productTypes?: string[]; languages?: string[]; maxDailyLeads?: number; maxWeeklyLeads?: number; agentIds?: string[] }) =>
      api.patch<any>(`/allocation/pools/${id}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allocation-pools'] });
      qc.invalidateQueries({ queryKey: ['allocation-pool'] });
    },
  });
}

export function useDeleteAllocationPool() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<any>(`/allocation/pools/${id}`, { token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['allocation-pools'] }); },
  });
}

export function useAllocationLogs(params?: Record<string, string>, enabled = true) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['allocation-logs', params],
    queryFn: () => api.get<any>(`/allocation/logs?${searchParams}`, { token }),
    enabled: !!token && enabled,
  });
}

export function useUnassignedLeads(params?: Record<string, string>) {
  const token = useToken();
  const searchParams = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['unassigned-leads', params],
    queryFn: () => api.get<any>(`/allocation/unassigned?${searchParams}`, { token }),
    enabled: !!token,
  });
}

export function useRetryAllocation() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => api.post<any>(`/allocation/allocate/${leadId}`, {}, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['unassigned-leads'] });
      qc.invalidateQueries({ queryKey: ['allocation-logs'] });
    },
  });
}

// ─── File Upload ─────────────────────────────────────────────────────────────

export function useUploadFile() {
  const token = useToken();
  return useMutation({
    mutationFn: ({ path, file }: { path: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<{ url: string }>(path, formData, { token });
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function useTeamMappings() {
  const token = useToken();
  return useQuery({
    queryKey: ['team-mappings'],
    queryFn: () => api.get<any>('/users/team-mappings', { token }),
    enabled: !!token,
  });
}

export function useAssignUnderwriter() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ salesExecId, underwriterId }: { salesExecId: string; underwriterId: string | null }) =>
      api.patch(`/users/${salesExecId}/assign-underwriter`, { underwriterId }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-mappings'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ─── Admin: User Management ───────────────────────────────────

export function useAllUsers() {
  const token = useToken();
  return useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get<any[]>('/users', { token }),
    enabled: !!token,
  });
}

export function useCreateUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string; role: string; department: string; language?: string }) =>
      api.post('/users', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useUpdateUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      api.patch(`/users/${id}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-users'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetPassword() {
  const token = useToken();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch(`/users/${id}/reset-password`, { password }, { token }),
  });
}

// ─── Admin: Activity Logs ─────────────────────────────────────

export function useActivityLogs(params?: Record<string, string>) {
  const token = useToken();
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => api.get<any>(`/activity${qs}`, { token }),
    enabled: !!token,
  });
}

// ─── Admin: Dashboard ─────────────────────────────────────────

export function useAdminDashboard() {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<any>('/reports/admin-dashboard', { token }),
    enabled: !!token,
  });
}

// ─── System Config ────────────────────────────────────────────

export function useSystemConfig() {
  const token = useToken();
  return useQuery({
    queryKey: ['system-config'],
    queryFn: () => api.get<any[]>('/system-config', { token }),
    enabled: !!token,
  });
}

export function useUpdateSystemConfig() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, label, category }: { key: string; value: string; label?: string; category?: string }) =>
      api.patch(`/system-config/${key}`, { value, label, category }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-config'] });
    },
  });
}

// ─── Product Catalog (Public — no auth) ───────────────────────

export function usePublicCatalog() {
  return useQuery({
    queryKey: ['public-catalog'],
    queryFn: () => api.get<any>('/product-catalog/public'),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}

export function usePublicReferenceData() {
  return useQuery({
    queryKey: ['public-reference-data'],
    queryFn: () => api.get<Record<string, string[]>>('/reference-data/public'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalculateQuotes() {
  return useMutation({
    mutationFn: (payload: { productCode: string; formData: Record<string, any> }) =>
      api.post<any[]>('/quote-engine/calculate', payload),
  });
}

// ─── Product Config Map (DB-first with static fallback) ──────
// Returns a PRODUCT_CONFIG-compatible map: Record<string, { label, iconKey }>

export function useProductConfigMap() {
  const token = useToken();
  const { data: products } = useQuery({
    queryKey: ['products-config-map'],
    queryFn: () => api.get<any[]>('/product-catalog/products?active=false', { token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    if (!products || products.length === 0) return PRODUCT_CONFIG as Record<string, { label: string; iconKey: string }>;
    const map: Record<string, { label: string; iconKey: string }> = {};
    for (const p of products) {
      map[p.code] = { label: p.label, iconKey: p.iconKey };
    }
    return map;
  }, [products]);
}

// ─── Admin: Product Catalog ───────────────────────────────────

export function useAdminProducts(activeOnly = true) {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-products', activeOnly],
    queryFn: () => api.get<any[]>(`/product-catalog/products?active=${activeOnly}`, { token }),
    enabled: !!token,
  });
}

export function useAdminProductDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => api.get<any>(`/product-catalog/products/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useUpdateProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/product-catalog/products/${id}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product'] });
    },
  });
}

export function useCreateProduct() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/product-catalog/products', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
}

export function useAdminModifiers() {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-modifiers'],
    queryFn: () => api.get<any[]>('/product-catalog/modifiers', { token }),
    enabled: !!token,
  });
}

export function useUpdateModifier() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/product-catalog/modifiers/${id}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-modifiers'] });
    },
  });
}

export function useCreateModifier() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/product-catalog/modifiers', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-modifiers'] });
    },
  });
}

export function useAdminRateTables(productId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-rates', productId],
    queryFn: () => api.get<any[]>(`/product-catalog/products/${productId}/rates`, { token }),
    enabled: !!token && !!productId,
  });
}

export function useUpsertRateTable() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...data }: { productId: string; insurerId: string; rate: number; effectiveFrom: string }) =>
      api.post(`/product-catalog/products/${productId}/rates`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rates'] });
      qc.invalidateQueries({ queryKey: ['public-catalog'] });
    },
  });
}

// ─── Admin: Insurers ──────────────────────────────────────────

export function useAdminInsurers(activeOnly = true) {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-insurers', activeOnly],
    queryFn: () => api.get<any[]>(`/insurers?active=${activeOnly}`, { token }),
    enabled: !!token,
  });
}

export function useAdminInsurerDetail(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-insurer', id],
    queryFn: () => api.get<any>(`/insurers/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export function useUpdateInsurer() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch(`/insurers/${id}`, data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-insurers'] });
      qc.invalidateQueries({ queryKey: ['admin-insurer'] });
    },
  });
}

export function useCreateInsurer() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/insurers', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-insurers'] });
    },
  });
}

// ─── Admin: Reference Data ────────────────────────────────────

export function useAdminReferenceData() {
  const token = useToken();
  return useQuery({
    queryKey: ['admin-reference-data'],
    queryFn: () => api.get<Record<string, any[]>>('/reference-data', { token }),
    enabled: !!token,
  });
}

export function useCreateReferenceData() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; code: string; label: string; sortOrder?: number }) =>
      api.post('/reference-data', data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reference-data'] });
    },
  });
}

export function useDeleteReferenceData() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reference-data/${id}`, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reference-data'] });
    },
  });
}

export function useExportReferenceDataCsv() {
  const token = useToken();
  return {
    exportCsv: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${baseUrl}/reference-data/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      return res.text();
    },
  };
}

export function useImportReferenceDataCsv() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) =>
      api.post<{ created: number; skipped: number; errors: string[] }>('/reference-data/import/csv', { csv }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reference-data'] });
    },
  });
}

// ─── Global Search ────────────────────────────────────────────────────────────

export function useGlobalSearch(query: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get<{ leads: any[]; customers: any[]; policies: any[] }>(
      `/search?q=${encodeURIComponent(query)}&limit=8`, { token },
    ),
    enabled: !!token && query.length >= 2,
    staleTime: 30_000,
  });
}

import { LeadStatus, PolicyStatus, EndorsementStatus, InvoiceStatus, AccountsQueueStatus, UwAssignmentStatus, LeadSource, UserRole, TaskStatus, TaskResponseType } from '../enums';

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

// ─── Role Colors ──────────────────────────────────────────────────────────────

export const ROLE_CONFIG: Record<string, StatusConfig> = {
  [UserRole.ADMIN]:       { label: 'Admin',       color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  [UserRole.SALES_EXEC]:  { label: 'Sales Exec',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [UserRole.SALES_ADMIN]: { label: 'Sales Admin',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  [UserRole.ACCOUNTANT]:  { label: 'Accountant',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [UserRole.UNDERWRITER]: { label: 'Underwriter', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [UserRole.UW_MANAGER]:  { label: 'UW Manager',  color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
};

// ─── Action Colors ────────────────────────────────────────────────────────────

export const ACTION_COLOR_CONFIG: Record<string, { color: string; bg: string }> = {
  CREATED:        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  EDITED:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  STATUS_CHANGE:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ASSIGNED:       { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  APPROVED:       { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  DECLINED:       { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CONVERTED:      { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  COMPLETED:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  CANCELLED:      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  ISSUED:         { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  PASSWORD_RESET: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

// ─── Temperature Config ───────────────────────────────────────────────────────

export const TEMPERATURE_CONFIG: Record<string, { label: string; color: string }> = {
  hot:  { label: 'HOT',  color: '#ef4444' },
  warm: { label: 'WARM', color: '#f59e0b' },
  cold: { label: 'COLD', color: '#6b7280' },
};

// ─── Task Status ───────────────────────────────────────────────────────────────

export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  [TaskStatus.OPEN]:      { label: 'Open',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  [TaskStatus.COMPLETED]: { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [TaskStatus.OVERDUE]:   { label: 'Overdue',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// ─── Task Response ─────────────────────────────────────────────────────────────

export const TASK_RESPONSE_CONFIG: Record<TaskResponseType, StatusConfig> = {
  [TaskResponseType.CALLBACK]:       { label: 'Callback',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [TaskResponseType.NO_ANSWER]:      { label: 'No Answer',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [TaskResponseType.QUOTATION_SENT]: { label: 'Quotation Sent', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  [TaskResponseType.LOST_LEAD]:      { label: 'Lost Lead',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  [TaskResponseType.REDUNDANT_LEAD]: { label: 'Redundant Lead', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  [TaskResponseType.TOO_EARLY]:      { label: 'Too Early',      color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  [TaskResponseType.TRANSFERRED]:    { label: 'Transferred',    color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

// ─── Lead Status ──────────────────────────────────────────────────────────────

export const LEAD_STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
  [LeadStatus.NEW]:        { label: 'New',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [LeadStatus.CONTACTED]:  { label: 'Contacted',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [LeadStatus.QUOTED]:     { label: 'Quoted',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  [LeadStatus.SELECTED]:   { label: 'Selected',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  [LeadStatus.CONVERTED]:  { label: 'Converted',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [LeadStatus.LOST]:       { label: 'Lost',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string }> = {
  [LeadSource.WEB]:        { label: 'Web' },
  [LeadSource.PHONE]:      { label: 'Phone' },
  [LeadSource.REFERRAL]:   { label: 'Referral' },
  [LeadSource.BROKER]:     { label: 'Broker' },
  [LeadSource.WALK_IN]:    { label: 'Walk-in' },
  [LeadSource.SOCIAL]:     { label: 'Social' },
  [LeadSource.AGGREGATOR]: { label: 'Aggregator' },
  [LeadSource.PARTNER]:    { label: 'Partner' },
};

// ─── Policy Status ────────────────────────────────────────────────────────────

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, StatusConfig> = {
  [PolicyStatus.PENDING_UW]: { label: 'Pending UW',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [PolicyStatus.ACTIVE]:     { label: 'Active',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [PolicyStatus.CANCELLED]:  { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  [PolicyStatus.EXPIRED]:    { label: 'Expired',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

// ─── Endorsement Status ───────────────────────────────────────────────────────

export const ENDORSEMENT_STATUS_CONFIG: Record<EndorsementStatus, StatusConfig> = {
  [EndorsementStatus.DRAFT]:            { label: 'Draft',            color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  [EndorsementStatus.PENDING_APPROVAL]: { label: 'Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [EndorsementStatus.APPROVED]:         { label: 'Approved',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [EndorsementStatus.PENDING_UW]:       { label: 'Pending UW',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  [EndorsementStatus.UW_IN_PROGRESS]:   { label: 'UW In Progress',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  [EndorsementStatus.PENDING_COMPLETION]: { label: 'Pending Cancellation', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  [EndorsementStatus.COMPLETED]:        { label: 'Completed',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [EndorsementStatus.REJECTED]:         { label: 'Rejected',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// ─── Invoice Status ───────────────────────────────────────────────────────────

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  [InvoiceStatus.DRAFT]:            { label: 'Draft',            color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  [InvoiceStatus.PENDING_APPROVAL]: { label: 'Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [InvoiceStatus.APPROVED]:         { label: 'Approved',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  [InvoiceStatus.PAID]:             { label: 'Paid',             color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [InvoiceStatus.CANCELLED]:        { label: 'Cancelled',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// ─── Accounts Queue Status ────────────────────────────────────────────────────

export const ACCOUNTS_QUEUE_STATUS_CONFIG: Record<AccountsQueueStatus, StatusConfig> = {
  [AccountsQueueStatus.PENDING]:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [AccountsQueueStatus.IN_REVIEW]: { label: 'In Review', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  [AccountsQueueStatus.APPROVED]:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [AccountsQueueStatus.COMPLETED]: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [AccountsQueueStatus.REJECTED]:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// ─── UW Assignment Status ─────────────────────────────────────────────────────

export const UW_ASSIGNMENT_STATUS_CONFIG: Record<UwAssignmentStatus, StatusConfig> = {
  [UwAssignmentStatus.QUEUED]:      { label: 'Queued',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  [UwAssignmentStatus.IN_PROGRESS]: { label: 'In Progress',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  [UwAssignmentStatus.COMPLETED]:   { label: 'Completed',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  [UwAssignmentStatus.RETURNED]:    { label: 'Returned',     color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
};

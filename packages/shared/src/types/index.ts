import {
  UserRole, Department, LeadStatus, LeadSource,
  ProductType, Currency, PolicyStatus,
  EndorsementType, EndorsementStatus,
  InvoiceType, InvoiceStatus,
  AccountsQueueType, AccountsQueueStatus,
  UwAssignmentStatus, NotificationType,
} from '../enums';

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  avatar?: string | null;
  language: string;
  isActive: boolean;
  isOnLeave?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  department: Department;
}

// ─── Lead ────────────────────────────────────────────────────────────────────

export interface LeadDocument {
  id: string;
  leadId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  ref: string;
  productType: string;
  formData: string;
  quotesData?: string | null;
  selectedQuote?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  nationality?: string | null;
  residence?: string | null;
  contactPref: string;
  currency: string;
  language: string;
  source: string;
  status: string;
  statusNote?: string | null;
  score: number;
  assignedToId?: string | null;
  assignedTo?: User | null;
  declineReason?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: LeadDocument[];
  assignmentLogs?: LeadAssignmentLog[];
  customers?: CustomerID[];
  tasks?: LeadTask[];
  temperatureOverride?: string | null;
}

// ─── Lead Task ────────────────────────────────────────────────────────────────

export interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: string;
  completedAt?: string | null;
  assignedToId: string;
  assignedTo?: User | null;
  createdById: string;
  createdBy?: User | null;
  responseType?: string | null;
  responseNotes?: string | null;
  lostReason?: string | null;
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithTasks {
  id: string;
  ref: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  assignedTo?: { id: string; name: string } | null;
  openTaskCount: number;
  nextDueDate?: string | null;
  hasCustomers: boolean;
  createdAt: string;
}

// ─── Customer ID ─────────────────────────────────────────────────────────────

export interface CustomerID {
  id: string;
  ref: string;
  leadId: string;
  lead?: Lead | null;
  customerName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  nationality?: string | null;
  residence?: string | null;
  contactPref: string;
  currency: string;
  language: string;
  createdById: string;
  createdBy?: User | null;
  createdAt: string;
  updatedAt: string;
  policies?: Policy[];
  endorsements?: Endorsement[];
  invoices?: Invoice[];
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export interface Policy {
  id: string;
  ref: string;
  customerIdId: string;
  customerId?: CustomerID | null;
  insurer: string;
  product: string;
  premium: number;
  sumInsured: number;
  commission: number;
  commissionRate: number;
  startDate: string;
  endDate: string;
  status: PolicyStatus;
  policyDocument?: string | null;
  issuedById?: string | null;
  issuedBy?: User | null;
  issuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  endorsements?: Endorsement[];
  invoices?: Invoice[];
}

// ─── Endorsement ─────────────────────────────────────────────────────────────

export interface Endorsement {
  id: string;
  ref: string;
  policyId: string;
  policy?: Policy | null;
  customerIdId: string;
  customerId?: CustomerID | null;
  type: EndorsementType;
  status: EndorsementStatus;
  details?: string | null;
  effectiveDate?: string | null;
  financialImpact?: number | null;
  reason?: string | null;
  // UW-filled document fields
  creditNoteNumber?: string | null;
  creditNoteAmount?: number | null;
  creditNotePath?: string | null;
  cancellationLetterPath?: string | null;
  refundCalculationPath?: string | null;
  revisedDocumentPath?: string | null;
  // Cancellation-specific UW fields
  debitNoteNumber?: string | null;
  debitNoteAmount?: number | null;
  debitNotePath?: string | null;
  cancellationDate?: string | null;
  endorsementCertificatePath?: string | null;
  completedAt?: string | null;
  requestedById: string;
  requestedBy?: User | null;
  processedById?: string | null;
  processedBy?: User | null;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
  uwAssignments?: UwAssignment[];
  accountsQueueItems?: AccountsQueueItem[];
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerIdId: string;
  customerId?: CustomerID | null;
  policyId?: string | null;
  policy?: Policy | null;
  endorsementId?: string | null;
  endorsement?: Endorsement | null;
  type: InvoiceType;
  amount: number;
  vat: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  notes?: string | null;
  policyPurchaseType?: string | null;
  createdById: string;
  createdBy?: User | null;
  approvedById?: string | null;
  approvedBy?: User | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Accounts Queue ──────────────────────────────────────────────────────────

export interface AccountsQueueItem {
  id: string;
  type: AccountsQueueType;
  invoiceId?: string | null;
  invoice?: Invoice | null;
  endorsementId?: string | null;
  endorsement?: Endorsement | null;
  status: AccountsQueueStatus;
  assignedToId?: string | null;
  assignedTo?: User | null;
  notes?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── UW Assignment ───────────────────────────────────────────────────────────

export interface UwAssignment {
  id: string;
  policyId?: string | null;
  policy?: Policy | null;
  endorsementId?: string | null;
  endorsement?: Endorsement | null;
  underwriterId: string;
  underwriter?: User | null;
  status: UwAssignmentStatus;
  assignedById?: string | null;
  assignedBy?: User | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId?: string | null;
  entityType?: string | null;
  userId: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  entityId: string;
  entityType: string;
  userId: string;
  user?: User;
  action: string;
  detail?: string | null;
  createdAt: string;
}

// ─── Dashboard / Reports ─────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCommission: number;
  pendingEndorsements: number;
  pendingInvoices: number;
  leadsByStatus: Record<string, number>;
  policiesByProduct: Record<string, number>;
}

export interface MasterReportEndorsement {
  ref: string;
  type: string;
  status: string;
  date?: string | null;
  impact?: number | null;
}

export interface MasterReportRow {
  leadId: string;
  customerId: string;
  customerName: string;
  policyId: string;
  policyNumber: string;
  insurer: string;
  product: string;
  originalPremium: number;
  premiumCharged?: number | null;
  endorsements: MasterReportEndorsement[];
  netPosition: number;
  salesExecutive: string;
  underwriter: string;
  debitNoteNumber?: string | null;
  debitNoteAmount?: number | null;
  creditNoteNumber?: string | null;
  creditNoteAmount?: number | null;
  cancellationDate?: string | null;
  cancellationStatus?: string | null;
  cancDebitNoteNumber?: string | null;
  cancDebitNoteAmount?: number | null;
  cancCreditNoteNumber?: string | null;
  cancCreditNoteAmount?: number | null;
  status: string;
  startDate: string;
  endDate: string;
}

export interface ProductionReportRow {
  invoiceNumber: string;
  customerName: string;
  type: string;
  amount: number;
  vat: number;
  total: number;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export interface WsNotificationPayload {
  notification: Notification;
}

// ─── Allocation ───────────────────────────────────────────────────────────────

export interface AllocationPool {
  id: string;
  name: string;
  productTypes: string[];
  languages: string[];
  isActive: boolean;
  maxDailyLeads: number;
  maxWeeklyLeads: number;
  agents?: AllocationPoolAgent[];
  createdAt: string;
  updatedAt: string;
}

export interface AllocationPoolAgent {
  id: string;
  poolId: string;
  userId: string;
  isActive: boolean;
  lastAssignedAt?: string | null;
  user?: { id: string; name: string };
  createdAt: string;
}

export interface LeadAssignmentLog {
  id: string;
  leadId: string;
  assignedToId: string;
  assignedById?: string | null;
  poolId?: string | null;
  method: string;
  reason?: string | null;
  createdAt: string;
  assignedTo?: { id: string; name: string };
  assignedBy?: { id: string; name: string } | null;
}

export interface AllocationResult {
  assigned: boolean;
  agentId?: string;
  agentName?: string;
  poolId?: string;
  poolName?: string;
  reason: string;
}

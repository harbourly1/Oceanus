import { z } from 'zod';
import {
  UserRole, Department, LeadStatus, LeadSource, LeadDeclineReason, LeadTemperature,
  ProductType, Currency, PolicyStatus,
  EndorsementType, EndorsementStatus,
  InvoiceType, InvoiceStatus,
  AccountsQueueStatus, UwAssignmentStatus,
  TaskStatus, TaskResponseType,
  PolicyPurchaseType,
} from '../enums';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const zEnum = <T extends Record<string, string>>(e: T) =>
  z.nativeEnum(e as any) as z.ZodNativeEnum<T>;

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: zEnum(UserRole),
  department: zEnum(Department),
});

export type RegisterDto = z.infer<typeof registerSchema>;

// ─── Lead ────────────────────────────────────────────────────────────────────

export const updateLeadStatusSchema = z.object({
  status: zEnum(LeadStatus),
  note: z.string().max(1000).optional(),
  declineReason: zEnum(LeadDeclineReason).optional(),
}).refine(
  (data) => {
    if (data.status === LeadStatus.LOST) {
      return !!data.declineReason;
    }
    return true;
  },
  { message: 'declineReason is required when status is lost', path: ['declineReason'] },
);

export type UpdateLeadStatusDto = z.infer<typeof updateLeadStatusSchema>;

export const assignLeadSchema = z.object({
  assignedToId: z.string().uuid('Invalid user ID'),
});

export type AssignLeadDto = z.infer<typeof assignLeadSchema>;

export const leadFilterSchema = paginationSchema.extend({
  status: zEnum(LeadStatus).optional(),
  productType: zEnum(ProductType).optional(),
  source: zEnum(LeadSource).optional(),
  temperature: zEnum(LeadTemperature).optional(),
  assignedToId: z.string().uuid().optional(),
  scoreMin: z.coerce.number().min(0).optional(),
  scoreMax: z.coerce.number().max(100).optional(),
});

export type LeadFilterQuery = z.infer<typeof leadFilterSchema>;

// ─── Lead Task ────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  assignedToId: z.string().uuid('Invalid user ID'),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  status: zEnum(TaskStatus).optional(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export const taskFilterSchema = paginationSchema.extend({
  status: zEnum(TaskStatus).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  timePeriod: z.enum(['all', 'today', 'yesterday', 'last30', 'older30', 'tomorrow']).default('all'),
  scope: z.enum(['mine', 'all']).default('mine'),
});

export type TaskFilterQuery = z.infer<typeof taskFilterSchema>;

export const respondToTaskSchema = z.object({
  responseType: zEnum(TaskResponseType),
  notes: z.string().max(2000).optional(),
  followUpDueDate: z.string().optional(),
  lostReason: zEnum(LeadDeclineReason).optional(),
  transferredToId: z.string().uuid('Invalid user ID').optional(),
}).refine(
  (data) => {
    if (data.responseType === TaskResponseType.LOST_LEAD) {
      return !!data.lostReason;
    }
    return true;
  },
  { message: 'Lost lead reason is required when response is lost lead', path: ['lostReason'] },
).refine(
  (data) => {
    if (data.responseType !== TaskResponseType.LOST_LEAD && data.responseType !== TaskResponseType.REDUNDANT_LEAD && data.responseType !== TaskResponseType.TRANSFERRED) {
      return !!data.followUpDueDate;
    }
    return true;
  },
  { message: 'Follow up date is required for non-terminal responses', path: ['followUpDueDate'] },
).refine(
  (data) => {
    if (data.responseType === TaskResponseType.TRANSFERRED) {
      return !!data.transferredToId;
    }
    return true;
  },
  { message: 'Transfer target agent is required when response is transferred', path: ['transferredToId'] },
);

export type RespondToTaskDto = z.infer<typeof respondToTaskSchema>;

// ─── Customer ID ─────────────────────────────────────────────────────────────

export const createCustomerIdSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
});

export type CreateCustomerIdDto = z.infer<typeof createCustomerIdSchema>;

// ─── Policy ──────────────────────────────────────────────────────────────────

export const createPolicySchema = z.object({
  customerIdId: z.string().uuid('Invalid customer ID'),
  insurer: z.string().min(1, 'Insurer is required').max(200),
  product: zEnum(ProductType),
  premium: z.coerce.number().positive('Premium must be positive'),
  sumInsured: z.coerce.number().positive('Sum insured must be positive'),
  commission: z.coerce.number().min(0).default(0),
  commissionRate: z.coerce.number().min(0).max(100).default(0),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
});

export type CreatePolicyDto = z.infer<typeof createPolicySchema>;

export const updatePolicyStatusSchema = z.object({
  status: zEnum(PolicyStatus),
  notes: z.string().max(1000).optional(),
});

export type UpdatePolicyStatusDto = z.infer<typeof updatePolicyStatusSchema>;

export const policyFilterSchema = paginationSchema.extend({
  status: zEnum(PolicyStatus).optional(),
  product: zEnum(ProductType).optional(),
  customerIdId: z.string().uuid().optional(),
});

export type PolicyFilterQuery = z.infer<typeof policyFilterSchema>;

// ─── Endorsement ─────────────────────────────────────────────────────────────

export const createEndorsementSchema = z.object({
  policyId: z.string().uuid('Invalid policy ID'),
  type: zEnum(EndorsementType),
  details: z.string().max(5000).optional(),
  effectiveDate: z.string().datetime().optional(),
});

export type CreateEndorsementDto = z.infer<typeof createEndorsementSchema>;

export const updateEndorsementStatusSchema = z.object({
  status: zEnum(EndorsementStatus),
  notes: z.string().max(1000).optional(),
});

export type UpdateEndorsementStatusDto = z.infer<typeof updateEndorsementStatusSchema>;

export const endorsementFilterSchema = paginationSchema.extend({
  status: zEnum(EndorsementStatus).optional(),
  type: zEnum(EndorsementType).optional(),
  policyId: z.string().uuid().optional(),
  customerIdId: z.string().uuid().optional(),
});

export type EndorsementFilterQuery = z.infer<typeof endorsementFilterSchema>;

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  customerIdId: z.string().uuid('Invalid customer ID'),
  policyId: z.string().uuid().optional(),
  endorsementId: z.string().uuid().optional(),
  type: zEnum(InvoiceType),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: zEnum(Currency).default(Currency.AED),
  dueDate: z.string().datetime('Invalid due date'),
  policyPurchaseType: zEnum(PolicyPurchaseType).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;

export const approveInvoiceSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export type ApproveInvoiceDto = z.infer<typeof approveInvoiceSchema>;

export const invoiceFilterSchema = paginationSchema.extend({
  status: zEnum(InvoiceStatus).optional(),
  type: zEnum(InvoiceType).optional(),
  customerIdId: z.string().uuid().optional(),
});

export type InvoiceFilterQuery = z.infer<typeof invoiceFilterSchema>;

// ─── Accounts Queue ──────────────────────────────────────────────────────────

export const processQueueItemSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'COMPLETE', 'RETURN', 'DECLINE']),
  notes: z.string().max(2000).optional(),
});

export type ProcessQueueItemDto = z.infer<typeof processQueueItemSchema>;

// ─── UW Assignment ───────────────────────────────────────────────────────────

export const createUwAssignmentSchema = z.object({
  policyId: z.string().uuid().optional(),
  endorsementId: z.string().uuid().optional(),
  underwriterId: z.string().uuid('Invalid underwriter ID'),
  notes: z.string().max(2000).optional(),
});

export type CreateUwAssignmentDto = z.infer<typeof createUwAssignmentSchema>;

export const completeUwAssignmentSchema = z.object({
  notes: z.string().max(2000).optional(),
  policyDocument: z.string().max(500).optional(),
});

export type CompleteUwAssignmentDto = z.infer<typeof completeUwAssignmentSchema>;

// ─── Allocation Pool ──────────────────────────────────────────────────────────

export const createAllocationPoolSchema = z.object({
  name: z.string().min(2, 'Pool name is required').max(200),
  productTypes: z.array(z.string()).min(1, 'At least one product type required'),
  languages: z.array(z.string()).min(1, 'At least one language required').default(['en']),
  maxDailyLeads: z.coerce.number().int().min(1).max(100).default(10),
  maxWeeklyLeads: z.coerce.number().int().min(1).max(500).default(50),
  agentIds: z.array(z.string().uuid()).min(1, 'At least one agent required'),
});

export type CreateAllocationPoolDto = z.infer<typeof createAllocationPoolSchema>;

export const updateAllocationPoolSchema = createAllocationPoolSchema.partial();

export type UpdateAllocationPoolDto = z.infer<typeof updateAllocationPoolSchema>;

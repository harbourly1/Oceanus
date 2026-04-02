// ─── User & Auth ─────────────────────────────────────────────────────────────

export enum UserRole {
  SALES_EXEC = 'SALES_EXEC',
  SALES_ADMIN = 'SALES_ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  UNDERWRITER = 'UNDERWRITER',
  UW_MANAGER = 'UW_MANAGER',
  ADMIN = 'ADMIN',
}

export enum Department {
  SALES = 'SALES',
  ACCOUNTS = 'ACCOUNTS',
  UNDERWRITING = 'UNDERWRITING',
  ADMIN = 'ADMIN',
}

// ─── Lead ────────────────────────────────────────────────────────────────────

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUOTED = 'quoted',
  SELECTED = 'selected',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum LeadSource {
  WEB = 'web',
  PHONE = 'phone',
  REFERRAL = 'referral',
  BROKER = 'broker',
  WALK_IN = 'walk_in',
  SOCIAL = 'social',
  AGGREGATOR = 'aggregator',
  PARTNER = 'partner',
}

export enum LeadTemperature {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
}

export enum LeadDeclineReason {
  PRICE_TOO_HIGH = 'price_too_high',
  COVERAGE_INADEQUATE = 'coverage_inadequate',
  COMPETITOR_SELECTED = 'competitor_selected',
  NO_RESPONSE = 'no_response',
  NOT_READY = 'not_ready',
  BUDGET_CONSTRAINT = 'budget_constraint',
  UNDERWRITING_RISK = 'underwriting_risk',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export enum TaskStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum TaskResponseType {
  CALLBACK = 'callback',
  NO_ANSWER = 'no_answer',
  QUOTATION_SENT = 'quotation_sent',
  LOST_LEAD = 'lost_lead',
  REDUNDANT_LEAD = 'redundant_lead',
  TOO_EARLY = 'too_early',
  TRANSFERRED = 'transferred',
}

// ─── Product ─────────────────────────────────────────────────────────────────

export enum ProductType {
  CARGO = 'CARGO',
  HULL = 'HULL',
  LIABILITY = 'LIABILITY',
  PLEASURE = 'PLEASURE',
  JETSKI = 'JETSKI',
  SPEEDBOAT = 'SPEEDBOAT',
  BARGE = 'BARGE',
}

export enum Currency {
  AED = 'AED',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export enum PolicyStatus {
  PENDING_UW = 'PENDING_UW',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

// ─── Endorsement ─────────────────────────────────────────────────────────────

export enum EndorsementType {
  CANCELLATION = 'CANCELLATION',
  EXTENSION = 'EXTENSION',
  NAME_CHANGE = 'NAME_CHANGE',
  ADDON = 'ADDON',
}

export enum EndorsementStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PENDING_UW = 'PENDING_UW',
  UW_IN_PROGRESS = 'UW_IN_PROGRESS',
  PENDING_COMPLETION = 'PENDING_COMPLETION',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export enum InvoiceType {
  NEW_POLICY = 'NEW_POLICY',
  CANCELLATION = 'CANCELLATION',
  EXTENSION = 'EXTENSION',
  NAME_CHANGE = 'NAME_CHANGE',
  ADDON = 'ADDON',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PolicyPurchaseType {
  ANNUAL = 'ANNUAL',
  TEMPORARY = 'TEMPORARY',
}

// ─── Accounts Queue ──────────────────────────────────────────────────────────

export enum AccountsQueueType {
  APPROVAL = 'APPROVAL',
  COMPLETION = 'COMPLETION',
}

export enum AccountsQueueStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

// ─── UW Assignment ───────────────────────────────────────────────────────────

export enum UwAssignmentStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  RETURNED = 'RETURNED',
}

// ─── Notification ────────────────────────────────────────────────────────────

export enum NotificationType {
  LEAD_ASSIGNMENT = 'LEAD_ASSIGNMENT',
  STATUS_CHANGE = 'STATUS_CHANGE',
  INVOICE = 'INVOICE',
  POLICY = 'POLICY',
  ENDORSEMENT = 'ENDORSEMENT',
  ACCOUNTS_QUEUE = 'ACCOUNTS_QUEUE',
  UW_ASSIGNMENT = 'UW_ASSIGNMENT',
  ALLOCATION = 'ALLOCATION',
  TASK = 'TASK',
}

export enum Portal {
  SALES = 'SALES',
  ACCOUNTS = 'ACCOUNTS',
  UNDERWRITING = 'UNDERWRITING',
}

// ─── Allocation ───────────────────────────────────────────────────────────────

export enum AllocationMethod {
  ROUND_ROBIN = 'ROUND_ROBIN',
  MANUAL = 'MANUAL',
}

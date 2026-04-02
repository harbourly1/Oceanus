import { LeadStatus, UserRole } from '../enums';

// ─── Lead Transition Rules ──────────────────────────────────────────────────

export interface LeadTransitionRule {
  allowed: LeadStatus[];
  roles: UserRole[];
}

export const LEAD_TRANSITION_MAP: Record<LeadStatus, LeadTransitionRule> = {
  [LeadStatus.NEW]: {
    allowed: [LeadStatus.CONTACTED, LeadStatus.QUOTED, LeadStatus.LOST],
    roles: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN, UserRole.ADMIN],
  },
  [LeadStatus.CONTACTED]: {
    allowed: [LeadStatus.QUOTED, LeadStatus.SELECTED, LeadStatus.NEW, LeadStatus.LOST],
    roles: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN, UserRole.ADMIN],
  },
  [LeadStatus.QUOTED]: {
    allowed: [LeadStatus.SELECTED, LeadStatus.CONTACTED, LeadStatus.LOST],
    roles: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN, UserRole.ADMIN],
  },
  [LeadStatus.SELECTED]: {
    allowed: [LeadStatus.CONVERTED, LeadStatus.QUOTED, LeadStatus.LOST],
    roles: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN, UserRole.ADMIN],
  },
  [LeadStatus.CONVERTED]: {
    allowed: [],
    roles: [],
  },
  [LeadStatus.LOST]: {
    allowed: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUOTED],
    roles: [UserRole.SALES_ADMIN, UserRole.ADMIN],
  },
};

export const LEAD_TERMINAL_STATUSES: LeadStatus[] = [
  LeadStatus.CONVERTED,
  LeadStatus.LOST,
];

export function validateLeadTransition(
  fromStatus: LeadStatus,
  toStatus: LeadStatus,
  userRole: UserRole,
): boolean {
  const rule = LEAD_TRANSITION_MAP[fromStatus];
  if (!rule) return false;
  if (!rule.allowed.includes(toStatus)) return false;
  if (userRole === UserRole.ADMIN) return true;
  return rule.roles.includes(userRole);
}

export function getNextLeadStatuses(
  currentStatus: LeadStatus,
  userRole: UserRole,
): LeadStatus[] {
  const rule = LEAD_TRANSITION_MAP[currentStatus];
  if (!rule) return [];
  if (userRole === UserRole.ADMIN) return rule.allowed;
  if (!rule.roles.includes(userRole)) return [];
  return rule.allowed;
}

// ─── Score Decay ────────────────────────────────────────────────────────────

/** After this many days of inactivity, score starts decaying */
export const SCORE_DECAY_DAYS = 30;

/** Points deducted per decay cycle */
export const SCORE_DECAY_POINTS = 5;

/** Score never drops below this value */
export const SCORE_DECAY_FLOOR = 5;

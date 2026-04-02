import { LeadTemperature } from '../enums';

// ─── Lead Scoring Configuration ───────────────────────────────────────────────

/** Points awarded by product type (max 25). Fallback when DB is unavailable. */
export const PRODUCT_WEIGHTS: Record<string, number> = {
  HULL: 25,
  CARGO: 20,
  LIABILITY: 20,
  BARGE: 18,
  PLEASURE: 10,
  SPEEDBOAT: 8,
  JETSKI: 5,
};

/** Points awarded by sum insured value tier (max 40) */
export const SUM_INSURED_TIERS: { min: number; max: number; points: number }[] = [
  { min: 0, max: 50_000, points: 5 },
  { min: 50_000, max: 250_000, points: 10 },
  { min: 250_000, max: 1_000_000, points: 20 },
  { min: 1_000_000, max: 5_000_000, points: 30 },
  { min: 5_000_000, max: Infinity, points: 40 },
];

/** Points awarded for each optional contact field filled (max 20) */
export const COMPLETENESS_FIELDS = ['phone', 'company', 'nationality', 'residence'] as const;
export const COMPLETENESS_POINTS_PER_FIELD = 5;

/** Bonus points if any documents were uploaded (max 15) */
export const DOCUMENTS_BONUS = 15;

/** Maximum possible score */
export const MAX_LEAD_SCORE = 100;

/** Compute the sum-insured tier points for a given value */
export function getSumInsuredPoints(value: number): number {
  for (const tier of SUM_INSURED_TIERS) {
    if (value >= tier.min && value < tier.max) return tier.points;
  }
  return 5;
}

// ─── Temperature Classification ─────────────────────────────────────────────

/** Score threshold for HOT leads */
export const HOT_THRESHOLD = 70;

/** Score threshold for WARM leads (below this is COLD) */
export const WARM_THRESHOLD = 40;

/**
 * Derive temperature purely from lead score (legacy / fallback).
 * Use `getLeadTemperatureWithCategory` for the full category-aware classification.
 */
export function getLeadTemperature(score: number): LeadTemperature {
  if (score >= HOT_THRESHOLD) return LeadTemperature.HOT;
  if (score >= WARM_THRESHOLD) return LeadTemperature.WARM;
  return LeadTemperature.COLD;
}

/**
 * Category-aware lead temperature classification.
 *
 * Professional CRM mapping:
 *   HOT  = New leads (fresh opportunity) + Renewal leads (returning customer)
 *   WARM = Lost leads (single loss) + LR (Late Response — overdue task, still recoverable)
 *   COLD = LLR (Lost Lost Renewal / Very Late — 48h+ overdue, likely disengaged)
 *          + Converted leads (completed, no action needed)
 *          + Stale leads (no activity 7+ days)
 *
 * Manual temperature override always takes priority when set.
 */
export interface LeadCategoryInput {
  status: string;
  score: number;
  temperatureOverride?: string | null;
  isRenewal: boolean;
  hasOverdueTask: boolean;
  hasVeryOverdueTask: boolean; // 48h+ overdue
  isStale: boolean;            // no activity in 7+ days
}

export function getLeadTemperatureWithCategory(input: LeadCategoryInput): LeadTemperature {
  // Manual override always wins
  if (input.temperatureOverride) {
    return input.temperatureOverride as LeadTemperature;
  }

  // Terminal: converted leads are cold (no action needed)
  if (input.status === 'converted') return LeadTemperature.COLD;

  // LLR (very late response 48h+) → cold
  if (input.hasVeryOverdueTask) return LeadTemperature.COLD;

  // Stale (no activity 7+ days) → cold
  if (input.isStale && !['new'].includes(input.status)) return LeadTemperature.COLD;

  // Lost leads or LR (late response) → warm (still recoverable)
  if (input.status === 'lost') return LeadTemperature.WARM;
  if (input.hasOverdueTask) return LeadTemperature.WARM;

  // New leads → hot (fresh opportunity)
  if (input.status === 'new') return LeadTemperature.HOT;

  // Renewal leads → hot (returning customer, high conversion probability)
  if (input.isRenewal) return LeadTemperature.HOT;

  // Active pipeline leads (contacted/quoted/selected): use score-based classification
  return getLeadTemperature(input.score);
}

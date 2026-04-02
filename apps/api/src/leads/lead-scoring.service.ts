import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PRODUCT_WEIGHTS,
  getSumInsuredPoints,
  COMPLETENESS_FIELDS,
  COMPLETENESS_POINTS_PER_FIELD,
  DOCUMENTS_BONUS,
  MAX_LEAD_SCORE,
  SCORE_DECAY_DAYS,
  SCORE_DECAY_POINTS,
  SCORE_DECAY_FLOOR,
} from '@oceanus/shared';

export interface ScoreResult {
  score: number;
  breakdown: {
    productWeight: number;
    sumInsuredTier: number;
    completeness: number;
    documentsBonus: number;
    total: number;
  };
}

@Injectable()
export class LeadScoringService {
  constructor(private prisma: PrismaService) {}

  async computeScore(lead: {
    productType: string;
    formData: string;
    phone?: string | null;
    company?: string | null;
    nationality?: string | null;
    residence?: string | null;
    documents?: { id: string }[];
  }): Promise<ScoreResult> {
    // 1. Product weight from DB (fallback to static PRODUCT_WEIGHTS)
    let productWeight = PRODUCT_WEIGHTS[lead.productType?.toUpperCase()] || 5;
    try {
      const product = await this.prisma.product.findUnique({
        where: { code: lead.productType?.toUpperCase() },
        select: { scoringWeight: true },
      });
      if (product) {
        productWeight = product.scoringWeight;
      }
    } catch {
      // DB unavailable — use static fallback
    }

    // 2. Sum insured tier (max 40)
    let sumInsured = 0;
    try {
      const formData = typeof lead.formData === 'string' ? JSON.parse(lead.formData) : lead.formData || {};
      sumInsured = Number(formData.sumInsured || formData.vesselValue || formData.cargoValue || formData.hullValue || 0);
    } catch {
      // fallback to 0
    }
    const sumInsuredTier = getSumInsuredPoints(sumInsured);

    // 3. Completeness (max 20)
    let completeness = 0;
    const fields: Record<string, unknown> = lead as any;
    for (const field of COMPLETENESS_FIELDS) {
      if (fields[field]) completeness += COMPLETENESS_POINTS_PER_FIELD;
    }

    // 4. Documents bonus (max 15)
    const documentsBonus = (lead.documents && lead.documents.length > 0) ? DOCUMENTS_BONUS : 0;

    const total = Math.min(productWeight + sumInsuredTier + completeness + documentsBonus, MAX_LEAD_SCORE);

    return {
      score: total,
      breakdown: { productWeight, sumInsuredTier, completeness, documentsBonus, total },
    };
  }

  decayScore(currentScore: number, lastActivityAt: Date | null): number {
    if (!lastActivityAt || currentScore <= SCORE_DECAY_FLOOR) return currentScore;

    const now = new Date();
    const daysSince = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < SCORE_DECAY_DAYS) return currentScore;

    const decayCycles = Math.floor(daysSince / SCORE_DECAY_DAYS);
    const decayed = currentScore - (decayCycles * SCORE_DECAY_POINTS);
    return Math.max(decayed, SCORE_DECAY_FLOOR);
  }
}

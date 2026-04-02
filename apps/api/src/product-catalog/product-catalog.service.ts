import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductCatalogService {
  constructor(private prisma: PrismaService) {}

  // ─── Products ───────────────────────────────────────────────────────────────

  async findAllProducts(activeOnly = true) {
    return this.prisma.product.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findProductByCode(code: string) {
    return this.prisma.product.findUnique({ where: { code } });
  }

  async findProductById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        rateTables: { where: { isActive: true }, include: { insurer: true } },
        riskModifiers: { where: { isActive: true } },
        coverageInclusions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        commissionSchedules: { where: { isActive: true } },
      },
    });
  }

  async createProduct(data: any) {
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, data: any) {
    return this.prisma.product.update({ where: { id }, data });
  }

  // ─── Rate Tables ────────────────────────────────────────────────────────────

  async findRatesByProduct(productId: string) {
    return this.prisma.rateTable.findMany({
      where: { productId, isActive: true },
      include: { insurer: true },
      orderBy: { insurer: { sortOrder: 'asc' } },
    });
  }

  async upsertRate(productId: string, insurerId: string, rate: number, effectiveFrom: Date) {
    return this.prisma.rateTable.upsert({
      where: { productId_insurerId_effectiveFrom: { productId, insurerId, effectiveFrom } },
      update: { rate },
      create: { productId, insurerId, rate, effectiveFrom },
    });
  }

  // ─── Risk Modifiers ─────────────────────────────────────────────────────────

  async findModifiersByType(modifierType: string) {
    return this.prisma.riskModifier.findMany({
      where: { modifierType, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllModifiers() {
    return this.prisma.riskModifier.findMany({
      where: { isActive: true },
      orderBy: [{ modifierType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createModifier(data: any) {
    return this.prisma.riskModifier.create({ data });
  }

  async updateModifier(id: string, data: any) {
    return this.prisma.riskModifier.update({ where: { id }, data });
  }

  // ─── Coverage Inclusions ────────────────────────────────────────────────────

  async findInclusionsByProduct(productId: string) {
    return this.prisma.coverageInclusion.findMany({
      where: { productId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createInclusion(data: any) {
    return this.prisma.coverageInclusion.create({ data });
  }

  async updateInclusion(id: string, data: any) {
    return this.prisma.coverageInclusion.update({ where: { id }, data });
  }

  // ─── Commission Schedules ───────────────────────────────────────────────────

  async findCommissionByProduct(productId: string) {
    return this.prisma.commissionSchedule.findMany({
      where: { productId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async upsertCommission(data: any) {
    return this.prisma.commissionSchedule.create({ data });
  }

  // ─── Public Catalog (for landing page — no auth) ───────────────────────────

  async getPublicCatalog() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, code: true, label: true, description: true, iconKey: true,
        color: true, estimatedMinutes: true, formStepsJson: true, formFieldsJson: true,
        defaultsJson: true, badge: true, sortOrder: true,
        baseRateMin: true, baseRateMax: true, deductibleRate: true,
        coverageMultiplier: true, valueField: true,
      },
    });

    const insurers = await this.prisma.insurer.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, code: true, name: true, logo: true, rating: true,
        specialty: true, competitiveFactor: true, responseHours: true,
      },
    });

    const rateTables = await this.prisma.rateTable.findMany({
      where: { isActive: true },
      select: { productId: true, insurerId: true, rate: true },
    });

    const riskModifiers = await this.prisma.riskModifier.findMany({
      where: { isActive: true },
      orderBy: [{ modifierType: 'asc' }, { sortOrder: 'asc' }],
      select: { modifierType: true, conditionKey: true, factor: true, productId: true },
    });

    const inclusions = await this.prisma.coverageInclusion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { productId: true, inclusionText: true },
    });

    return { products, insurers, rateTables, riskModifiers, inclusions };
  }
}

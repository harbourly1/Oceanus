import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getLeadTemperatureWithCategory } from '@oceanus/shared';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userRole: string, userId: string) {
    const [
      totalLeads, totalCustomers, totalPolicies, activePolicies,
      pendingEndorsements, pendingInvoices,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.customerID.count(),
      this.prisma.policy.count(),
      this.prisma.policy.count({ where: { status: 'ACTIVE' } }),
      this.prisma.endorsement.count({ where: { status: { in: ['DRAFT', 'PENDING_APPROVAL', 'PENDING_UW', 'UW_IN_PROGRESS'] } } }),
      this.prisma.invoice.count({ where: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } }),
    ]);

    // Aggregate premiums and commissions from active policies
    const policies = await this.prisma.policy.findMany({
      where: { status: 'ACTIVE' },
      select: { premium: true, commission: true, product: true },
    });

    const totalPremium = policies.reduce((sum, p) => sum + p.premium, 0);
    const totalCommission = policies.reduce((sum, p) => sum + p.commission, 0);

    const policiesByProduct: Record<string, number> = {};
    for (const p of policies) {
      policiesByProduct[p.product] = (policiesByProduct[p.product] || 0) + 1;
    }

    // Leads breakdown: status, temperature, category
    const leads = await this.prisma.lead.findMany({
      select: { id: true, status: true, score: true, temperatureOverride: true, lastActivityAt: true },
    });
    const leadsByStatus: Record<string, number> = {};
    const leadsByTemperature: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    const leadsByCategory: Record<string, number> = { new: 0, renewal: 0, lost: 0, stale: 0 };

    // Get lead IDs that have customers (renewal leads)
    const renewalLeadIds = new Set(
      (await this.prisma.customerID.findMany({ select: { leadId: true }, distinct: ['leadId'] }))
        .map(c => c.leadId),
    );

    // Get lead IDs with late-response tasks (open tasks past due)
    const now = new Date();
    const overdueTasksByLead = await this.prisma.leadTask.findMany({
      where: { status: 'open', dueDate: { lt: now } },
      select: { leadId: true, dueDate: true },
    });

    const llrThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const lateResponseLeadIds = new Set(overdueTasksByLead.map(t => t.leadId));
    const veryLateResponseLeadIds = new Set(
      overdueTasksByLead.filter(t => t.dueDate < llrThreshold).map(t => t.leadId),
    );

    const staleDays = 7;
    const staleThreshold = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

    for (const l of leads) {
      // By status
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;

      // Determine category flags for this lead
      const isRenewal = renewalLeadIds.has(l.id);
      const hasOverdueTask = lateResponseLeadIds.has(l.id);
      const hasVeryOverdueTask = veryLateResponseLeadIds.has(l.id);
      const lastAct = l.lastActivityAt || new Date(0);
      const isStale = !['converted', 'lost'].includes(l.status) && lastAct < staleThreshold;

      // Temperature — category-aware (connected to status, renewal, LR, LLR)
      const temp = getLeadTemperatureWithCategory({
        status: l.status,
        score: l.score,
        temperatureOverride: l.temperatureOverride,
        isRenewal,
        hasOverdueTask,
        hasVeryOverdueTask,
        isStale,
      });
      leadsByTemperature[temp] = (leadsByTemperature[temp] || 0) + 1;

      // By category
      if (l.status === 'lost') {
        leadsByCategory.lost++;
      } else if (isRenewal) {
        leadsByCategory.renewal++;
      } else if (l.status === 'new') {
        leadsByCategory.new++;
      }

      if (isStale) {
        leadsByCategory.stale++;
      }
    }

    // Late response (LR): leads with overdue open tasks
    const lateResponseCount = lateResponseLeadIds.size;
    // Late-late response (LLR): leads with tasks overdue by 48h+
    const lateLateResponseCount = veryLateResponseLeadIds.size;

    // Accounts queue stats
    const [approvalPending, completionPending] = await Promise.all([
      this.prisma.accountsQueueItem.count({ where: { type: 'APPROVAL', status: 'PENDING' } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'COMPLETION', status: 'PENDING' } }),
    ]);

    // UW queue stats
    const uwQueued = await this.prisma.uwAssignment.count({ where: { status: { in: ['QUEUED', 'IN_PROGRESS'] } } });

    return {
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalPremium,
      totalCommission,
      pendingEndorsements,
      pendingInvoices,
      leadsByStatus,
      leadsByTemperature,
      leadsByCategory,
      lateResponseCount,
      lateLateResponseCount,
      policiesByProduct,
      approvalPending,
      completionPending,
      uwQueued,
    };
  }

  /**
   * Master Report per CRM spec:
   * Lead ID, Customer ID, Customer Name, Policy ID, Policy Number, Insurer, Product,
   * Original Premium, All Endorsements, Net Position, Sales Executive, All Invoice IDs,
   * Accountant Approvals, Underwriter Name, All Documents
   */
  async getMasterReport(params: {
    page?: number;
    limit?: number;
    product?: string;
    status?: string;
    insurer?: string;
    dateFrom?: string;
    dateTo?: string;
    salesExecutiveId?: string;
    underwriterId?: string;
  }) {
    const { page = 1, limit = 50, product, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (product) where.product = product;
    if (status) where.status = status;
    if (insurer) where.insurer = insurer;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (underwriterId) where.issuedById = underwriterId;
    if (salesExecutiveId) {
      where.customerId = { lead: { assignedToId: salesExecutiveId } };
    }

    const [data, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: {
          customerId: {
            include: {
              lead: {
                select: { id: true, ref: true, assignedTo: { select: { id: true, name: true } } },
              },
            },
          },
          issuedBy: { select: { id: true, name: true } },
          endorsements: {
            select: {
              id: true, ref: true, type: true, status: true, effectiveDate: true,
              financialImpact: true, creditNoteNumber: true, creditNoteAmount: true, completedAt: true,
              debitNoteNumber: true, debitNoteAmount: true, cancellationDate: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          invoices: {
            select: {
              id: true, invoiceNumber: true, type: true, amount: true, total: true,
              status: true, receiptAmount: true, approvedBy: { select: { id: true, name: true } },
              approvedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.policy.count({ where }),
    ]);

    const rows = data.map((p) => {
      const endorsementImpact = p.endorsements
        .filter(e => e.status === 'COMPLETED' && e.financialImpact)
        .reduce((sum, e) => sum + (e.financialImpact || 0), 0);

      // Find the latest cancellation endorsement (if any)
      const cancellation = p.endorsements.find(e => e.type === 'CANCELLATION');

      return {
        leadId: p.customerId?.lead?.ref || '',
        customerId: p.customerId?.ref || '',
        customerName: p.customerId?.customerName || '',
        policyId: p.ref,
        policyNumber: p.policyNumber || '',
        insurer: p.insurer,
        product: p.product,
        originalPremium: p.premium,
        premiumCharged: p.premiumCharged,
        endorsements: p.endorsements.map(e => ({
          ref: e.ref, type: e.type, status: e.status,
          date: e.completedAt || e.effectiveDate, impact: e.financialImpact,
        })),
        netPosition: p.premium + endorsementImpact,
        salesExecutive: p.customerId?.lead?.assignedTo?.name || '',
        invoices: p.invoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber, type: inv.type, amount: inv.total,
          receiptAmount: inv.receiptAmount, status: inv.status,
          approvedBy: inv.approvedBy?.name, approvedAt: inv.approvedAt,
        })),
        underwriter: p.issuedBy?.name || '',
        documents: {
          policyDocument: p.policyDocument,
          policySchedule: p.policySchedule,
          debitNotePath: p.debitNotePath,
          creditNotePath: p.creditNotePath,
        },
        debitNoteNumber: p.debitNoteNumber,
        debitNoteAmount: p.debitNoteAmount,
        creditNoteNumber: p.creditNoteNumber,
        creditNoteAmount: p.creditNoteAmount,
        // Cancellation-specific columns
        cancellationDate: cancellation?.cancellationDate?.toISOString() || null,
        cancellationStatus: cancellation?.status || null,
        cancDebitNoteNumber: cancellation?.debitNoteNumber || null,
        cancDebitNoteAmount: cancellation?.debitNoteAmount ?? null,
        cancCreditNoteNumber: cancellation?.creditNoteNumber || null,
        cancCreditNoteAmount: cancellation?.creditNoteAmount ?? null,
        status: p.status,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
      };
    });

    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Accountant Production Report per CRM spec:
   * Customer ID, Customer Name, Insurer Name, Sales Executive, Underwriter,
   * Receipt Amount, Debit Note Amount, Credit Note Amount, Policy Status, Transaction Type
   */
  async getProductionReport(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    insurer?: string;
    dateFrom?: string;
    dateTo?: string;
    salesExecutiveId?: string;
    underwriterId?: string;
  }) {
    const { page = 1, limit = 50, type, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Filter by insurer via the related policy
    if (insurer) {
      where.policy = { ...where.policy, insurer };
    }
    // Filter by sales executive via customerId -> lead -> assignedToId
    if (salesExecutiveId) {
      where.customerId = { lead: { assignedToId: salesExecutiveId } };
    }
    // Filter by underwriter via policy -> issuedById
    if (underwriterId) {
      where.policy = { ...where.policy, issuedById: underwriterId };
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customerId: {
            include: {
              lead: {
                select: { assignedTo: { select: { id: true, name: true } } },
              },
            },
          },
          policy: {
            select: {
              insurer: true, status: true, issuedBy: { select: { id: true, name: true } },
              debitNoteAmount: true, creditNoteAmount: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const rows = data.map((inv) => ({
      customerId: inv.customerId?.ref || '',
      customerName: inv.customerId?.customerName || '',
      insurerName: inv.policy?.insurer || '',
      salesExecutive: inv.customerId?.lead?.assignedTo?.name || '',
      underwriter: inv.policy?.issuedBy?.name || '',
      receiptAmount: inv.receiptAmount,
      debitNoteAmount: inv.policy?.debitNoteAmount,
      creditNoteAmount: inv.policy?.creditNoteAmount,
      policyStatus: inv.policy?.status || '',
      transactionType: inv.type,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      vat: inv.vat,
      total: inv.total,
      status: inv.status,
      paymentMode: inv.paymentMode,
      policyPurchaseType: inv.policyPurchaseType || '',
      createdAt: inv.createdAt.toISOString(),
      approvedAt: inv.approvedAt?.toISOString() || null,
      approvedBy: inv.approvedBy?.name || null,
    }));

    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAdminDashboard() {
    const [
      totalUsers, activeUsers,
      totalLeads, totalCustomers, totalPolicies, activePolicies,
      totalEndorsements, totalInvoices,
      uwQueueCount, approvalQueueCount, completionQueueCount,
      usersByRoleRaw,
      activePoliciesData,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.lead.count(),
      this.prisma.customerID.count(),
      this.prisma.policy.count(),
      this.prisma.policy.count({ where: { status: 'ACTIVE' } }),
      this.prisma.endorsement.count(),
      this.prisma.invoice.count(),
      this.prisma.uwAssignment.count({ where: { status: { in: ['QUEUED', 'IN_PROGRESS'] } } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'APPROVAL', status: 'PENDING' } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'COMPLETION', status: 'PENDING' } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { role: true }, where: { isActive: true } }),
      this.prisma.policy.findMany({ where: { status: 'ACTIVE' }, select: { premium: true } }),
      this.prisma.activity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    const usersByRole: Record<string, number> = {};
    for (const entry of usersByRoleRaw) {
      usersByRole[entry.role] = entry._count.role;
    }

    const totalPremium = activePoliciesData.reduce((sum, p) => sum + p.premium, 0);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole,
      totalLeads,
      totalCustomers,
      totalPolicies,
      activePolicies,
      totalEndorsements,
      totalInvoices,
      totalPremium,
      uwQueueCount,
      approvalQueueCount,
      completionQueueCount,
      recentActivity,
    };
  }

  private escapeCsv(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async getMasterReportCsv(params: {
    product?: string; status?: string; insurer?: string;
    dateFrom?: string; dateTo?: string;
    salesExecutiveId?: string; underwriterId?: string;
  }): Promise<string> {
    const result = await this.getMasterReport({ ...params, page: 1, limit: 10000 });
    const headers = [
      'Lead ID', 'Customer ID', 'Customer Name', 'Policy Ref', 'Policy Number',
      'Insurer', 'Product', 'Premium', 'Premium Charged', 'Net Position', 'Status',
      'Start Date', 'End Date', 'Sales Executive', 'Underwriter',
      'Debit Note #', 'Debit Note Amt', 'Credit Note #', 'Credit Note Amt',
      'Cancellation Date', 'Canc Status',
      'Endorsement Count', 'Endorsement Types', 'Total Endorsement Impact',
    ];
    const lines = [headers.join(',')];
    for (const r of result.data) {
      const endorsementTypes = [...new Set(r.endorsements.map(e => e.type))].join(', ');
      const totalImpact = r.endorsements
        .filter(e => e.impact != null)
        .reduce((sum, e) => sum + (e.impact || 0), 0);
      lines.push([
        r.leadId, r.customerId, r.customerName, r.policyId, r.policyNumber,
        r.insurer, r.product, r.originalPremium, r.premiumCharged, r.netPosition, r.status,
        r.startDate?.split('T')[0] || '', r.endDate?.split('T')[0] || '',
        r.salesExecutive, r.underwriter,
        r.debitNoteNumber, r.debitNoteAmount, r.creditNoteNumber, r.creditNoteAmount,
        r.cancellationDate?.split('T')[0] || '', r.cancellationStatus || '',
        r.endorsements.length, endorsementTypes, totalImpact || '',
      ].map(v => this.escapeCsv(v)).join(','));
    }
    return lines.join('\n');
  }

  async getProductionReportCsv(params: {
    type?: string; status?: string; insurer?: string;
    dateFrom?: string; dateTo?: string;
    salesExecutiveId?: string; underwriterId?: string;
  }): Promise<string> {
    const result = await this.getProductionReport({ ...params, page: 1, limit: 10000 });
    const headers = [
      'Customer ID', 'Customer Name', 'Insurer', 'Sales Executive', 'Underwriter',
      'Invoice #', 'Type', 'Amount', 'VAT', 'Total', 'Receipt Amount',
      'Debit Note Amt', 'Credit Note Amt', 'Policy Status', 'Policy Purchase Type', 'Status',
      'Payment Mode', 'Created At', 'Approved By', 'Approved At',
    ];
    const lines = [headers.join(',')];
    for (const r of result.data) {
      lines.push([
        r.customerId, r.customerName, r.insurerName, r.salesExecutive, r.underwriter,
        r.invoiceNumber, r.transactionType, r.amount, r.vat, r.total, r.receiptAmount,
        r.debitNoteAmount, r.creditNoteAmount, r.policyStatus, r.policyPurchaseType, r.status,
        r.paymentMode, r.createdAt?.split('T')[0] || '', r.approvedBy || '', r.approvedAt?.split('T')[0] || '',
      ].map(v => this.escapeCsv(v)).join(','));
    }
    return lines.join('\n');
  }
}

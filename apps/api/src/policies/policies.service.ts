import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { EmailService } from '../email/email.service';

/** Parse a date-only string (YYYY-MM-DD) safely to avoid timezone shift */
function parseDate(d: string): Date {
  // If date-only (no time component), append noon to prevent UTC midnight → previous day shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00');
  return new Date(d);
}

@Injectable()
export class PoliciesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
  ) {}

  private async generateRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.policy.count({
      where: { ref: { startsWith: `P-${year}-` } },
    });
    return `P-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(data: {
    customerIdId: string;
    insurer: string;
    product: string;
    premium: number;
    sumInsured: number;
    commission?: number;
    commissionRate?: number;
    startDate: string;
    endDate: string;
  }) {
    const customer = await this.prisma.customerID.findUnique({ where: { id: data.customerIdId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const ref = await this.generateRef();

    return this.prisma.policy.create({
      data: {
        ref,
        customerIdId: data.customerIdId,
        insurer: data.insurer,
        product: data.product,
        premium: data.premium,
        sumInsured: data.sumInsured,
        commission: data.commission ?? 0,
        commissionRate: data.commissionRate ?? 0,
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.endDate),
        status: 'PENDING_UW',
      },
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    product?: string;
    customerIdId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, status, product, customerIdId, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PolicyWhereInput = {};
    if (status) where.status = status;
    if (product) where.product = product;
    if (customerIdId) where.customerIdId = customerIdId;
    if (search) {
      where.OR = [
        { ref: { contains: search } },
        { insurer: { contains: search } },
        { customerId: { customerName: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: {
          customerId: { select: { id: true, ref: true, customerName: true } },
          issuedBy: { select: { id: true, name: true } },
          _count: { select: { endorsements: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.policy.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
        customerId: {
          include: { lead: { select: { id: true, ref: true, productType: true } } },
        },
        issuedBy: { select: { id: true, name: true } },
        endorsements: {
          include: { requestedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        invoices: { orderBy: { createdAt: 'desc' } },
        uwAssignments: {
          include: { underwriter: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async updateStatus(id: string, status: string, userId?: string, policyDocument?: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: { customerId: { include: { lead: { select: { assignedToId: true } } } } },
    });
    if (!policy) throw new NotFoundException('Policy not found');

    const updateData: any = { status };
    if (status === 'ACTIVE' && userId) {
      updateData.issuedById = userId;
      updateData.issuedAt = new Date();
    }
    if (policyDocument) {
      updateData.policyDocument = policyDocument;
    }

    const updated = await this.prisma.policy.update({
      where: { id },
      data: updateData,
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
        issuedBy: { select: { id: true, name: true } },
      },
    });

    // Activity log
    if (userId) {
      this.activity.log({ entityId: id, entityType: 'policy', userId, action: 'STATUS_CHANGE', detail: `Policy ${policy.ref} → ${status}` });
    }

    // Notify sales exec when policy is issued
    if (status === 'ACTIVE' && policy.customerId?.lead?.assignedToId) {
      const salesExecId = policy.customerId.lead.assignedToId;
      this.notifications.notifyPolicyIssued(id, salesExecId, policy.ref);
      const salesExec = await this.prisma.user.findUnique({ where: { id: salesExecId }, select: { email: true } });
      if (salesExec) {
        this.email.sendPolicyIssued(salesExec.email, policy.ref, policy.customerId.customerName);
      }
    }

    return updated;
  }

  async updateFields(id: string, data: {
    policyNumber?: string;
    policyHolderName?: string;
    premiumCharged?: number;
    sumInsured?: number;
    startDate?: string;
    endDate?: string;
    debitNoteNumber?: string;
    debitNoteAmount?: number;
    debitNotePath?: string;
    creditNoteNumber?: string;
    creditNoteAmount?: number;
    creditNotePath?: string;
    policyDocument?: string;
    policySchedule?: string;
  }, userId: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');

    const updateData: any = {};
    const changedFields: string[] = [];

    if (data.policyNumber !== undefined) { updateData.policyNumber = data.policyNumber; changedFields.push('policyNumber'); }
    if (data.policyHolderName !== undefined) { updateData.policyHolderName = data.policyHolderName; changedFields.push('policyHolderName'); }
    if (data.premiumCharged !== undefined) { updateData.premiumCharged = data.premiumCharged; changedFields.push('premiumCharged'); }
    if (data.sumInsured !== undefined) { updateData.sumInsured = data.sumInsured; changedFields.push('sumInsured'); }
    if (data.startDate !== undefined) { updateData.startDate = parseDate(data.startDate); changedFields.push('startDate'); }
    if (data.endDate !== undefined) { updateData.endDate = parseDate(data.endDate); changedFields.push('endDate'); }
    if (data.debitNoteNumber !== undefined) { updateData.debitNoteNumber = data.debitNoteNumber; changedFields.push('debitNoteNumber'); }
    if (data.debitNoteAmount !== undefined) { updateData.debitNoteAmount = data.debitNoteAmount; changedFields.push('debitNoteAmount'); }
    if (data.debitNotePath !== undefined) { updateData.debitNotePath = data.debitNotePath; changedFields.push('debitNotePath'); }
    if (data.creditNoteNumber !== undefined) { updateData.creditNoteNumber = data.creditNoteNumber; changedFields.push('creditNoteNumber'); }
    if (data.creditNoteAmount !== undefined) { updateData.creditNoteAmount = data.creditNoteAmount; changedFields.push('creditNoteAmount'); }
    if (data.creditNotePath !== undefined) { updateData.creditNotePath = data.creditNotePath; changedFields.push('creditNotePath'); }
    if (data.policyDocument !== undefined) { updateData.policyDocument = data.policyDocument; changedFields.push('policyDocument'); }
    if (data.policySchedule !== undefined) { updateData.policySchedule = data.policySchedule; changedFields.push('policySchedule'); }

    if (changedFields.length === 0) return policy;

    const updated = await this.prisma.policy.update({
      where: { id },
      data: updateData,
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
        issuedBy: { select: { id: true, name: true } },
      },
    });

    this.activity.log({
      entityId: id, entityType: 'policy', userId, action: 'EDITED',
      detail: `Policy ${policy.ref} fields updated: ${changedFields.join(', ')}`,
    });

    return updated;
  }
}

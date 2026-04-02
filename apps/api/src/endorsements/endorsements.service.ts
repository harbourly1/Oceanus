import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { EmailService } from '../email/email.service';

/** Parse a date-only string (YYYY-MM-DD) safely to avoid timezone shift */
function parseDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00');
  return new Date(d);
}

@Injectable()
export class EndorsementsService {
  private readonly logger = new Logger(EndorsementsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
  ) {}

  private async generateRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.endorsement.count({
      where: { ref: { startsWith: `E-${year}-` } },
    });
    return `E-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(data: {
    policyId: string;
    type: string;
    details?: string;
    effectiveDate?: string;
    reason?: string;
    financialImpact?: number;
  }, userId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: data.policyId },
      include: { customerId: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    if (policy.status !== 'ACTIVE' && data.type !== 'CANCELLATION') {
      throw new BadRequestException('Can only create endorsements for active policies');
    }

    const ref = await this.generateRef();

    // Cancellation goes directly to PENDING_UW (no accounts approval needed per spec)
    // Other types start as DRAFT, sales creates invoice → accounts approves → then UW
    const initialStatus = data.type === 'CANCELLATION' ? 'PENDING_UW' : 'DRAFT';

    const endorsement = await this.prisma.endorsement.create({
      data: {
        ref,
        policyId: data.policyId,
        customerIdId: policy.customerIdId,
        type: data.type,
        status: initialStatus,
        details: data.details || null,
        effectiveDate: data.effectiveDate ? parseDate(data.effectiveDate) : null,
        reason: data.reason || null,
        financialImpact: data.financialImpact ?? null,
        requestedById: userId,
      },
      include: {
        policy: { select: { id: true, ref: true, product: true } },
        customerId: { select: { id: true, ref: true, customerName: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    // Activity log + notification
    this.activity.log({ entityId: endorsement.id, entityType: 'endorsement', userId, action: 'CREATED', detail: `Endorsement ${endorsement.ref} (${data.type}) created` });

    // Notify UW managers for cancellation (goes directly to PENDING_UW)
    if (data.type === 'CANCELLATION') {
      // Auto-create UW assignment for cancellation (bypasses invoice/accounts flow)
      const salesExec = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, assignedUnderwriterId: true },
      });
      if (salesExec?.assignedUnderwriterId) {
        await this.prisma.uwAssignment.create({
          data: {
            endorsementId: endorsement.id,
            underwriterId: salesExec.assignedUnderwriterId,
            status: 'QUEUED',
            notes: `Auto-assigned cancellation endorsement ${endorsement.ref}`,
          },
        });
        this.logger.log(`Auto-created UW assignment for cancellation ${endorsement.ref} -> underwriter ${salesExec.assignedUnderwriterId}`);
        // Notify the assigned underwriter
        const uw = await this.prisma.user.findUnique({ where: { id: salesExec.assignedUnderwriterId }, select: { email: true, name: true } });
        if (uw) {
          this.notifications.notifyEndorsement(endorsement.id, salesExec.assignedUnderwriterId, endorsement.ref, 'Cancellation Assigned');
          this.email.sendEndorsementUpdate(uw.email, endorsement.ref, 'Cancellation Endorsement Assigned for Review');
        }
      } else {
        this.logger.warn(`No underwriter mapped for user ${salesExec?.name || userId}. Cancellation ${endorsement.ref} needs manual UW assignment.`);
      }

      const uwManagers = await this.prisma.user.findMany({ where: { role: 'UW_MANAGER', isActive: true }, select: { id: true, email: true } });
      for (const mgr of uwManagers) {
        this.notifications.notifyEndorsement(endorsement.id, mgr.id, endorsement.ref, 'Cancellation Pending UW');
        this.email.sendEndorsementUpdate(mgr.email, endorsement.ref, 'Cancellation Pending UW Review');
      }
    }

    return endorsement;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    policyId?: string;
    customerIdId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, status, type, policyId, customerIdId, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.EndorsementWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (policyId) where.policyId = policyId;
    if (customerIdId) where.customerIdId = customerIdId;
    if (search) {
      where.OR = [
        { ref: { contains: search } },
        { customerId: { customerName: { contains: search } } },
        { policy: { ref: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.endorsement.findMany({
        where,
        include: {
          policy: { select: { id: true, ref: true, product: true, insurer: true } },
          customerId: { select: { id: true, ref: true, customerName: true } },
          requestedBy: { select: { id: true, name: true } },
          processedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.endorsement.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const endorsement = await this.prisma.endorsement.findUnique({
      where: { id },
      include: {
        policy: {
          include: { customerId: { select: { id: true, ref: true, customerName: true } } },
        },
        customerId: true,
        requestedBy: { select: { id: true, name: true } },
        processedBy: { select: { id: true, name: true } },
        invoices: { orderBy: { createdAt: 'desc' } },
        uwAssignments: {
          include: { underwriter: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!endorsement) throw new NotFoundException('Endorsement not found');
    return endorsement;
  }

  async findByPolicy(policyId: string) {
    return this.prisma.endorsement.findMany({
      where: { policyId },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, userId?: string) {
    const endorsement = await this.prisma.endorsement.findUnique({
      where: { id },
      include: { policy: true },
    });
    if (!endorsement) throw new NotFoundException('Endorsement not found');

    const updateData: any = { status };
    if (userId && (status === 'COMPLETED' || status === 'REJECTED')) {
      updateData.processedById = userId;
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.endorsement.update({
        where: { id },
        data: updateData,
        include: {
          policy: { select: { id: true, ref: true, product: true } },
          customerId: { select: { id: true, ref: true, customerName: true } },
        },
      });

      if (status === 'COMPLETED') {
        // Type-specific policy updates on endorsement completion
        switch (endorsement.type) {
          case 'CANCELLATION':
            await tx.policy.update({
              where: { id: endorsement.policyId },
              data: { status: 'CANCELLED' },
            });
            break;

          case 'EXTENSION':
            // Extend policy end date using endorsement's effectiveDate as the new end date
            if (endorsement.effectiveDate) {
              await tx.policy.update({
                where: { id: endorsement.policyId },
                data: { endDate: endorsement.effectiveDate },
              });
            }
            // Update sumInsured/premium if financial impact provided
            if (endorsement.financialImpact) {
              const policy = endorsement.policy;
              await tx.policy.update({
                where: { id: endorsement.policyId },
                data: { premium: policy.premium + endorsement.financialImpact },
              });
            }
            break;

          case 'NAME_CHANGE':
            // Update policy holder name from endorsement details
            if (endorsement.details) {
              try {
                const details = JSON.parse(endorsement.details);
                if (details.newHolderName) {
                  await tx.policy.update({
                    where: { id: endorsement.policyId },
                    data: { policyHolderName: details.newHolderName },
                  });
                }
                // Also update customer record name
                if (details.newHolderName && endorsement.customerIdId) {
                  await tx.customerID.update({
                    where: { id: endorsement.customerIdId },
                    data: { customerName: details.newHolderName },
                  });
                }
              } catch { /* details not valid JSON, skip */ }
            }
            break;

          case 'ADDON':
            // Increase sum insured and/or premium based on financial impact
            if (endorsement.financialImpact) {
              const policy = endorsement.policy;
              await tx.policy.update({
                where: { id: endorsement.policyId },
                data: {
                  premium: policy.premium + endorsement.financialImpact,
                  sumInsured: endorsement.details
                    ? (() => { try { const d = JSON.parse(endorsement.details!); return d.newSumInsured ?? policy.sumInsured; } catch { return policy.sumInsured; } })()
                    : policy.sumInsured,
                },
              });
            }
            break;
        }
      }

      // Activity log + notifications
      if (userId) {
        this.activity.log({ entityId: id, entityType: 'endorsement', userId, action: 'STATUS_CHANGE', detail: `Endorsement ${endorsement.ref} → ${status}` });
      }

      // Notify the requester about status change
      this.notifications.notifyEndorsement(id, endorsement.requestedById, endorsement.ref, `Status: ${status}`);
      const requester = await this.prisma.user.findUnique({ where: { id: endorsement.requestedById }, select: { email: true } });
      if (requester) {
        this.email.sendEndorsementUpdate(requester.email, endorsement.ref, `Status changed to ${status}`);
      }

      return updated;
    });
  }

  async updateFields(id: string, data: {
    creditNoteNumber?: string;
    creditNoteAmount?: number;
    creditNotePath?: string;
    cancellationLetterPath?: string;
    refundCalculationPath?: string;
    revisedDocumentPath?: string;
    effectiveDate?: string;
    financialImpact?: number;
    debitNoteNumber?: string;
    debitNoteAmount?: number;
    debitNotePath?: string;
    cancellationDate?: string;
    endorsementCertificatePath?: string;
  }, userId: string) {
    const endorsement = await this.prisma.endorsement.findUnique({ where: { id } });
    if (!endorsement) throw new NotFoundException('Endorsement not found');

    // Cancellation lock: once accountant completes, nobody can edit
    if (endorsement.type === 'CANCELLATION' && endorsement.status === 'COMPLETED') {
      throw new BadRequestException('Completed cancellation endorsements cannot be edited');
    }

    const updateData: any = {};
    const changedFields: string[] = [];

    if (data.creditNoteNumber !== undefined) { updateData.creditNoteNumber = data.creditNoteNumber; changedFields.push('creditNoteNumber'); }
    if (data.creditNoteAmount !== undefined) { updateData.creditNoteAmount = data.creditNoteAmount; changedFields.push('creditNoteAmount'); }
    if (data.creditNotePath !== undefined) { updateData.creditNotePath = data.creditNotePath; changedFields.push('creditNotePath'); }
    if (data.cancellationLetterPath !== undefined) { updateData.cancellationLetterPath = data.cancellationLetterPath; changedFields.push('cancellationLetterPath'); }
    if (data.refundCalculationPath !== undefined) { updateData.refundCalculationPath = data.refundCalculationPath; changedFields.push('refundCalculationPath'); }
    if (data.revisedDocumentPath !== undefined) { updateData.revisedDocumentPath = data.revisedDocumentPath; changedFields.push('revisedDocumentPath'); }
    if (data.effectiveDate !== undefined) { updateData.effectiveDate = parseDate(data.effectiveDate); changedFields.push('effectiveDate'); }
    if (data.financialImpact !== undefined) { updateData.financialImpact = data.financialImpact; changedFields.push('financialImpact'); }
    if (data.debitNoteNumber !== undefined) { updateData.debitNoteNumber = data.debitNoteNumber; changedFields.push('debitNoteNumber'); }
    if (data.debitNoteAmount !== undefined) { updateData.debitNoteAmount = data.debitNoteAmount; changedFields.push('debitNoteAmount'); }
    if (data.debitNotePath !== undefined) { updateData.debitNotePath = data.debitNotePath; changedFields.push('debitNotePath'); }
    if (data.cancellationDate !== undefined) { updateData.cancellationDate = parseDate(data.cancellationDate); changedFields.push('cancellationDate'); }
    if (data.endorsementCertificatePath !== undefined) { updateData.endorsementCertificatePath = data.endorsementCertificatePath; changedFields.push('endorsementCertificatePath'); }

    if (changedFields.length === 0) return endorsement;

    const updated = await this.prisma.endorsement.update({
      where: { id },
      data: updateData,
      include: {
        policy: { select: { id: true, ref: true, product: true } },
        customerId: { select: { id: true, ref: true, customerName: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    this.activity.log({
      entityId: id, entityType: 'endorsement', userId, action: 'EDITED',
      detail: `Endorsement ${endorsement.ref} fields updated: ${changedFields.join(', ')}`,
    });

    return updated;
  }
}

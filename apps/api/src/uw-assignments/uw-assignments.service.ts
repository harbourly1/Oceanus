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
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00');
  return new Date(d);
}

@Injectable()
export class UwAssignmentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
  ) {}

  async create(data: {
    policyId?: string;
    endorsementId?: string;
    underwriterId: string;
    notes?: string;
  }, assignedById: string) {
    if (!data.policyId && !data.endorsementId) {
      throw new BadRequestException('Either policyId or endorsementId is required');
    }

    // Validate underwriter
    const uw = await this.prisma.user.findUnique({ where: { id: data.underwriterId } });
    if (!uw) throw new NotFoundException('Underwriter not found');
    if (!['UNDERWRITER', 'UW_MANAGER'].includes(uw.role)) {
      throw new BadRequestException('Assigned user must be an underwriter');
    }

    const assignment = await this.prisma.uwAssignment.create({
      data: {
        policyId: data.policyId || null,
        endorsementId: data.endorsementId || null,
        underwriterId: data.underwriterId,
        assignedById,
        status: 'QUEUED',
        notes: data.notes || null,
      },
      include: {
        policy: { include: { customerId: { select: { id: true, ref: true, customerName: true } } } },
        endorsement: { include: { policy: { select: { id: true, ref: true } }, customerId: { select: { id: true, ref: true, customerName: true } } } },
        underwriter: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    // Build ref for notification
    const ref = assignment.policy?.ref || assignment.endorsement?.ref || 'Unknown';

    // Notify the underwriter + activity log
    this.activity.log({ entityId: assignment.id, entityType: 'uw_assignment', userId: assignedById, action: 'CREATED', detail: `UW Assignment for ${ref} assigned to ${uw.name}` });
    this.notifications.notifyUwAssignment(assignment.id, data.underwriterId, ref);
    this.email.sendUwAssignment(uw.email, ref, uw.name);

    return assignment;
  }

  async findQueue(params: {
    page?: number;
    limit?: number;
    status?: string;
    underwriterId?: string;
  }) {
    const { page = 1, limit = 20, status, underwriterId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UwAssignmentWhereInput = {};
    if (status) where.status = status;
    if (underwriterId) where.underwriterId = underwriterId;

    const [data, total] = await Promise.all([
      this.prisma.uwAssignment.findMany({
        where,
        include: {
          policy: {
            include: {
              customerId: {
                select: {
                  id: true, ref: true, customerName: true,
                  lead: { select: { id: true, ref: true, productType: true, formData: true, quotesData: true, selectedQuote: true, fullName: true, email: true, phone: true, company: true, currency: true } },
                },
              },
            },
          },
          endorsement: {
            include: {
              policy: { select: { id: true, ref: true, product: true } },
              customerId: {
                select: {
                  id: true, ref: true, customerName: true,
                  lead: { select: { id: true, ref: true, productType: true, formData: true, quotesData: true, selectedQuote: true, fullName: true, email: true, phone: true, company: true, currency: true } },
                },
              },
            },
          },
          underwriter: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.uwAssignment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const assignment = await this.prisma.uwAssignment.findUnique({
      where: { id },
      include: {
        policy: {
          include: {
            customerId: {
              include: {
                lead: { select: { id: true, ref: true, productType: true, formData: true, quotesData: true, selectedQuote: true, fullName: true, email: true, phone: true, company: true, nationality: true, residence: true, currency: true, source: true, documents: true } },
              },
            },
            endorsements: { orderBy: { createdAt: 'desc' } },
          },
        },
        endorsement: {
          include: {
            policy: true,
            customerId: {
              include: {
                lead: { select: { id: true, ref: true, productType: true, formData: true, quotesData: true, selectedQuote: true, fullName: true, email: true, phone: true, company: true, nationality: true, residence: true, currency: true, source: true, documents: true } },
              },
            },
            invoices: { orderBy: { createdAt: 'desc' } },
          },
        },
        underwriter: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });
    if (!assignment) throw new NotFoundException('UW Assignment not found');
    return assignment;
  }

  async startReview(id: string) {
    const assignment = await this.prisma.uwAssignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('UW Assignment not found');

    return this.prisma.uwAssignment.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async complete(id: string, data?: {
    notes?: string;
    // Policy issuance fields
    policyNumber?: string;
    policyHolderName?: string;
    premiumCharged?: number;
    policyDocument?: string;
    policySchedule?: string;
    debitNoteNumber?: string;
    debitNoteAmount?: number;
    debitNotePath?: string;
    creditNoteNumber?: string;
    creditNoteAmount?: number;
    creditNotePath?: string;
    startDate?: string;
    endDate?: string;
    sumInsured?: number;
    // Endorsement completion fields
    cancellationLetterPath?: string;
    refundCalculationPath?: string;
    revisedDocumentPath?: string;
    effectiveDate?: string;
    financialImpact?: number;
    cancellationDate?: string;
    endorsementCertificatePath?: string;
  }) {
    const assignment = await this.prisma.uwAssignment.findUnique({
      where: { id },
      include: { policy: true, endorsement: true },
    });
    if (!assignment) throw new NotFoundException('UW Assignment not found');

    return this.prisma.$transaction(async (tx) => {
      // Complete the assignment
      const updated = await tx.uwAssignment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: data?.notes || assignment.notes,
        },
      });

      // If policy assignment, validate required fields then mark policy as ACTIVE
      if (assignment.policyId) {
        // Validate required UW fields before marking ACTIVE
        const missingFields: string[] = [];
        if (!data?.policyNumber) missingFields.push('policyNumber');
        if (!data?.debitNoteNumber) missingFields.push('debitNoteNumber');
        if (data?.debitNoteAmount == null) missingFields.push('debitNoteAmount');
        if (!data?.policyDocument) missingFields.push('policyDocument');

        if (missingFields.length > 0) {
          throw new BadRequestException(
            `Required fields missing for policy issuance: ${missingFields.join(', ')}`,
          );
        }

        const policyUpdate: any = {
          status: 'ACTIVE',
          issuedById: assignment.underwriterId,
          issuedAt: new Date(),
        };
        if (data?.policyNumber) policyUpdate.policyNumber = data.policyNumber;
        if (data?.policyHolderName) policyUpdate.policyHolderName = data.policyHolderName;
        if (data?.premiumCharged != null) policyUpdate.premiumCharged = data.premiumCharged;
        if (data?.policyDocument) policyUpdate.policyDocument = data.policyDocument;
        if (data?.policySchedule) policyUpdate.policySchedule = data.policySchedule;
        if (data?.debitNoteNumber) policyUpdate.debitNoteNumber = data.debitNoteNumber;
        if (data?.debitNoteAmount != null) policyUpdate.debitNoteAmount = data.debitNoteAmount;
        if (data?.debitNotePath) policyUpdate.debitNotePath = data.debitNotePath;
        if (data?.creditNoteNumber) policyUpdate.creditNoteNumber = data.creditNoteNumber;
        if (data?.creditNoteAmount != null) policyUpdate.creditNoteAmount = data.creditNoteAmount;
        if (data?.creditNotePath) policyUpdate.creditNotePath = data.creditNotePath;
        if (data?.startDate) policyUpdate.startDate = parseDate(data.startDate);
        if (data?.endDate) policyUpdate.endDate = parseDate(data.endDate);
        if (data?.sumInsured != null) policyUpdate.sumInsured = data.sumInsured;

        await tx.policy.update({
          where: { id: assignment.policyId },
          data: policyUpdate,
        });
      }

      // If endorsement assignment, validate and mark endorsement as COMPLETED
      if (assignment.endorsementId) {
        const endorsement = assignment.endorsement!;

        // Validate required fields based on endorsement type
        if (endorsement.type === 'CANCELLATION') {
          const missingFields: string[] = [];
          if (!data?.creditNotePath) missingFields.push('creditNotePath');
          if (!data?.cancellationLetterPath) missingFields.push('cancellationLetterPath');
          if (!data?.endorsementCertificatePath) missingFields.push('endorsementCertificatePath');
          if (missingFields.length > 0) {
            throw new BadRequestException(
              `Required fields missing for cancellation: ${missingFields.join(', ')}`,
            );
          }
        }

        if (endorsement.type === 'EXTENSION') {
          const missingFields: string[] = [];
          if (!data?.revisedDocumentPath) missingFields.push('revisedDocumentPath');
          if (!data?.effectiveDate) missingFields.push('effectiveDate (new end date)');
          if (missingFields.length > 0) {
            throw new BadRequestException(
              `Required fields missing for extension: ${missingFields.join(', ')}`,
            );
          }
        }

        if (endorsement.type === 'NAME_CHANGE') {
          if (!data?.revisedDocumentPath) {
            throw new BadRequestException('Required field missing for name change: revisedDocumentPath');
          }
        }

        if (endorsement.type === 'ADDON') {
          const missingFields: string[] = [];
          if (!data?.revisedDocumentPath) missingFields.push('revisedDocumentPath');
          if (data?.financialImpact == null) missingFields.push('financialImpact');
          if (missingFields.length > 0) {
            throw new BadRequestException(
              `Required fields missing for addon: ${missingFields.join(', ')}`,
            );
          }
        }

        const isCancellation = endorsement.type === 'CANCELLATION';
        const endorsementUpdate: any = {
          status: isCancellation ? 'PENDING_COMPLETION' : 'COMPLETED',
          processedById: assignment.underwriterId,
        };
        if (!isCancellation) endorsementUpdate.completedAt = new Date();
        if (data?.creditNoteNumber) endorsementUpdate.creditNoteNumber = data.creditNoteNumber;
        if (data?.creditNoteAmount != null) endorsementUpdate.creditNoteAmount = data.creditNoteAmount;
        if (data?.creditNotePath) endorsementUpdate.creditNotePath = data.creditNotePath;
        if (data?.cancellationLetterPath) endorsementUpdate.cancellationLetterPath = data.cancellationLetterPath;
        if (data?.refundCalculationPath) endorsementUpdate.refundCalculationPath = data.refundCalculationPath;
        if (data?.revisedDocumentPath) endorsementUpdate.revisedDocumentPath = data.revisedDocumentPath;
        if (data?.effectiveDate) endorsementUpdate.effectiveDate = parseDate(data.effectiveDate);
        if (data?.financialImpact != null) endorsementUpdate.financialImpact = data.financialImpact;
        // Cancellation-specific fields
        if (data?.debitNoteNumber) endorsementUpdate.debitNoteNumber = data.debitNoteNumber;
        if (data?.debitNoteAmount != null) endorsementUpdate.debitNoteAmount = data.debitNoteAmount;
        if (data?.debitNotePath) endorsementUpdate.debitNotePath = data.debitNotePath;
        if (data?.cancellationDate) endorsementUpdate.cancellationDate = parseDate(data.cancellationDate);
        if (data?.endorsementCertificatePath) endorsementUpdate.endorsementCertificatePath = data.endorsementCertificatePath;

        await tx.endorsement.update({
          where: { id: assignment.endorsementId },
          data: endorsementUpdate,
        });

        // If cancellation, defer policy cancellation to accounts review — just queue it
        if (endorsement.type === 'CANCELLATION') {
          // Auto-create AccountsQueueItem for completion (accounts will review & finalize)
          await tx.accountsQueueItem.create({
            data: {
              type: 'COMPLETION',
              endorsementId: assignment.endorsementId!,
              status: 'PENDING',
            },
          });
        }

        // EXTENSION: update policy end date
        if (endorsement.type === 'EXTENSION' && data?.effectiveDate) {
          const policyUpdate: any = { endDate: parseDate(data.effectiveDate) };
          if (data.financialImpact != null) {
            const policy = await tx.policy.findUnique({ where: { id: endorsement.policyId } });
            if (policy) policyUpdate.premium = policy.premium + data.financialImpact;
          }
          await tx.policy.update({ where: { id: endorsement.policyId }, data: policyUpdate });
        }

        // NAME_CHANGE: update policy holder name from endorsement details
        if (endorsement.type === 'NAME_CHANGE' && endorsement.details) {
          try {
            const details = JSON.parse(endorsement.details);
            if (details.newHolderName) {
              await tx.policy.update({
                where: { id: endorsement.policyId },
                data: { policyHolderName: details.newHolderName },
              });
              await tx.customerID.update({
                where: { id: endorsement.customerIdId },
                data: { customerName: details.newHolderName },
              });
            }
          } catch { /* skip if details not valid JSON */ }
        }

        // ADDON: increase premium and optionally sumInsured
        if (endorsement.type === 'ADDON' && data?.financialImpact != null) {
          const policy = await tx.policy.findUnique({ where: { id: endorsement.policyId } });
          if (policy) {
            const addonUpdate: any = { premium: policy.premium + data.financialImpact };
            if (endorsement.details) {
              try {
                const d = JSON.parse(endorsement.details);
                if (d.newSumInsured) addonUpdate.sumInsured = d.newSumInsured;
              } catch { /* skip */ }
            }
            await tx.policy.update({ where: { id: endorsement.policyId }, data: addonUpdate });
          }
        }
      }

      // Activity log + notifications
      this.activity.log({ entityId: id, entityType: 'uw_assignment', userId: assignment.underwriterId, action: 'COMPLETED', detail: `UW Assignment completed` });
      if (assignment.assignedById) {
        this.notifications.notifyStatusChange(id, 'uw_assignment', assignment.assignedById, 'UW Assignment', 'COMPLETED');
      }
      if (assignment.policyId && assignment.policy) {
        const customer = await this.prisma.customerID.findUnique({
          where: { id: assignment.policy.customerIdId },
          include: { lead: { select: { assignedToId: true } } },
        });
        if (customer?.lead?.assignedToId) {
          this.notifications.notifyPolicyIssued(assignment.policyId, customer.lead.assignedToId, assignment.policy.ref);
        }
      }

      return updated;
    });
  }

  async returnAssignment(id: string, notes?: string) {
    const assignment = await this.prisma.uwAssignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('UW Assignment not found');

    const updated = await this.prisma.uwAssignment.update({
      where: { id },
      data: { status: 'RETURNED', notes: notes || null },
    });

    this.activity.log({ entityId: id, entityType: 'uw_assignment', userId: assignment.underwriterId, action: 'RETURNED', detail: `UW Assignment returned${notes ? ': ' + notes : ''}` });
    if (assignment.assignedById) {
      this.notifications.notifyStatusChange(id, 'uw_assignment', assignment.assignedById, 'UW Assignment', 'RETURNED');
    }

    return updated;
  }
}

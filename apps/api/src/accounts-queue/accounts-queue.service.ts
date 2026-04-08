import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { EmailService } from '../email/email.service';
import { UwAssignmentsService } from '../uw-assignments/uw-assignments.service';

@Injectable()
export class AccountsQueueService {
  private readonly logger = new Logger(AccountsQueueService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
    private uwAssignments: UwAssignmentsService,
  ) {}

  async createItem(data: {
    type: string;
    invoiceId?: string;
    endorsementId?: string;
  }) {
    return this.prisma.accountsQueueItem.create({
      data: {
        type: data.type,
        invoiceId: data.invoiceId || null,
        endorsementId: data.endorsementId || null,
        status: 'PENDING',
      },
      include: {
        invoice: { include: { customerId: { select: { id: true, ref: true, customerName: true } } } },
        endorsement: { include: { policy: { select: { id: true, ref: true } } } },
      },
    });
  }

  async findByType(type: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AccountsQueueItemWhereInput = { type };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.accountsQueueItem.findMany({
        where,
        include: {
          invoice: {
            include: {
              customerId: { select: { id: true, ref: true, customerName: true } },
              policy: { select: { id: true, ref: true, product: true } },
              createdBy: { select: { id: true, name: true } },
            },
          },
          endorsement: {
            include: {
              policy: { select: { id: true, ref: true, product: true } },
              customerId: { select: { id: true, ref: true, customerName: true } },
            },
          },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.accountsQueueItem.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const item = await this.prisma.accountsQueueItem.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customerId: true,
            policy: true,
            endorsement: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
        endorsement: {
          include: {
            policy: true,
            customerId: true,
            requestedBy: { select: { id: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async processItem(id: string, action: string, userId: string, notes?: string) {
    const item = await this.prisma.accountsQueueItem.findUnique({
      where: { id },
      include: { invoice: true, endorsement: true },
    });
    if (!item) throw new NotFoundException('Queue item not found');

    // Guard: prevent re-processing terminal items
    if (['APPROVED', 'REJECTED', 'COMPLETED', 'RETURNED'].includes(item.status)) {
      throw new NotFoundException('Queue item has already been processed');
    }

    let newStatus: string;
    switch (action) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        break;
      case 'COMPLETE':
        newStatus = 'COMPLETED';
        break;
      case 'RETURN':
        newStatus = 'RETURNED';
        break;
      case 'DECLINE':
        newStatus = 'REJECTED';
        break;
      default:
        newStatus = 'IN_REVIEW';
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.accountsQueueItem.update({
        where: { id },
        data: {
          status: newStatus,
          assignedToId: userId,
          notes: notes || null,
          processedAt: new Date(),
        },
        include: {
          invoice: { include: { customerId: { select: { id: true, ref: true, customerName: true } } } },
          endorsement: { include: { policy: { select: { id: true, ref: true } } } },
        },
      });

      // Cascade: when APPROVAL queue item is approved, update the invoice
      if (item.type === 'APPROVAL' && action === 'APPROVE' && item.invoiceId) {
        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });

        // If invoice is linked to an endorsement, transition endorsement to PENDING_UW
        if (item.endorsementId) {
          await tx.endorsement.update({
            where: { id: item.endorsementId },
            data: { status: 'PENDING_UW' },
          });
        }

        // If invoice is for a new policy and policy already exists, ensure policy is in PENDING_UW state
        const invoice = item.invoice!;
        if (invoice.policyId && invoice.type === 'NEW_POLICY') {
          await tx.policy.update({
            where: { id: invoice.policyId },
            data: { status: 'PENDING_UW' },
          });
        }
      }

      // Cascade: when APPROVAL queue item is rejected, decline the invoice
      if (item.type === 'APPROVAL' && action === 'REJECT' && item.invoiceId) {
        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: { status: 'DECLINED', remarks: notes || null, declinedAt: new Date(), approvedById: userId },
        });
      }

      // Cascade: when COMPLETION queue item is completed (cancellation), finalize endorsement
      if (item.type === 'COMPLETION' && action === 'COMPLETE' && item.endorsementId) {
        const endorsement = item.endorsement!;
        await tx.endorsement.update({
          where: { id: item.endorsementId },
          data: { status: 'COMPLETED', completedAt: new Date(), processedById: userId },
        });
        // Now cancel the parent policy (deferred from UW step)
        if (endorsement.policyId) {
          await tx.policy.update({
            where: { id: endorsement.policyId },
            data: { status: 'CANCELLED' },
          });
        }
      }

      // Cascade: when COMPLETION queue item is returned, send back to underwriter
      if (item.type === 'COMPLETION' && action === 'RETURN' && item.endorsementId) {
        // Revert endorsement to UW_IN_PROGRESS so UW can rework
        await tx.endorsement.update({
          where: { id: item.endorsementId },
          data: { status: 'UW_IN_PROGRESS' },
        });
        // Reset the UW assignment to IN_PROGRESS so it reappears in UW queue
        const uwAssignment = await tx.uwAssignment.findFirst({
          where: { endorsementId: item.endorsementId },
          orderBy: { createdAt: 'desc' },
        });
        if (uwAssignment) {
          await tx.uwAssignment.update({
            where: { id: uwAssignment.id },
            data: { status: 'IN_PROGRESS', completedAt: null },
          });
        }
      }

      // Cascade: when COMPLETION queue item is declined, reject cancellation — policy stays active
      if (item.type === 'COMPLETION' && action === 'DECLINE' && item.endorsementId) {
        await tx.endorsement.update({
          where: { id: item.endorsementId },
          data: { status: 'REJECTED', completedAt: new Date(), processedById: userId },
        });
        // Policy remains ACTIVE — no change needed
      }

      return updated;
    }).then(async (updated) => {
      // Activity log
      this.activity.log({ entityId: id, entityType: 'accounts_queue', userId, action, detail: `Queue item ${item.type} → ${newStatus}` });

      // Notify invoice creator when their invoice is approved/declined
      if (item.type === 'APPROVAL' && item.invoiceId && item.invoice) {
        const invoiceAction = action === 'APPROVE' ? 'Approved' : action === 'REJECT' ? 'Declined' : newStatus;
        this.notifications.notifyInvoice(item.invoiceId, item.invoice.createdById, item.invoice.invoiceNumber, invoiceAction);
        const creator = await this.prisma.user.findUnique({ where: { id: item.invoice.createdById }, select: { email: true } });
        if (creator) this.email.sendInvoiceAction(creator.email, item.invoice.invoiceNumber, invoiceAction);

        // Auto-create UW assignment after invoice approval
        if (action === 'APPROVE') {
          try {
            await this.autoCreateUwAssignment(item.invoice, userId);
          } catch (err) {
            this.logger.warn(`Auto UW assignment failed for invoice ${item.invoice.invoiceNumber}: ${(err as Error).message}`);
          }
        }
      }

      // Notify accountants when cancellation queue item is processed
      if (item.type === 'COMPLETION' && item.endorsementId && item.endorsement) {
        const endorsement = item.endorsement;
        const actionLabel = action === 'COMPLETE' ? 'Completed' : action === 'RETURN' ? 'Returned' : action === 'DECLINE' ? 'Declined' : newStatus;

        // Notify the sales exec who requested the endorsement
        if (endorsement.requestedById) {
          this.notifications.notifyEndorsement(item.endorsementId, endorsement.requestedById, endorsement.ref, `Cancellation ${actionLabel}`);
        }

        // For RETURN, notify the underwriter so they know to rework
        if (action === 'RETURN') {
          const uwAssignment = await this.prisma.uwAssignment.findFirst({
            where: { endorsementId: item.endorsementId },
            orderBy: { createdAt: 'desc' },
            select: { underwriterId: true, underwriter: { select: { email: true, name: true } } },
          });
          if (uwAssignment) {
            this.notifications.notifyEndorsement(item.endorsementId, uwAssignment.underwriterId, endorsement.ref, 'Cancellation Returned by Accounts');
            if (uwAssignment.underwriter?.email) {
              this.email.sendEndorsementUpdate(uwAssignment.underwriter.email, endorsement.ref, 'Returned by Accounts');
            }
          }
        }

        // For DECLINE, notify both sales exec AND underwriter
        if (action === 'DECLINE') {
          const uwAssignment = await this.prisma.uwAssignment.findFirst({
            where: { endorsementId: item.endorsementId },
            orderBy: { createdAt: 'desc' },
            select: { underwriterId: true, underwriter: { select: { email: true, name: true } } },
          });
          if (uwAssignment) {
            this.notifications.notifyEndorsement(item.endorsementId, uwAssignment.underwriterId, endorsement.ref, 'Cancellation Declined — Policy Active');
            if (uwAssignment.underwriter?.email) {
              this.email.sendEndorsementUpdate(uwAssignment.underwriter.email, endorsement.ref, 'Declined');
            }
          }
          // Email the sales exec too
          if (endorsement.requestedById) {
            const salesExec = await this.prisma.user.findUnique({ where: { id: endorsement.requestedById }, select: { email: true } });
            if (salesExec?.email) {
              this.email.sendEndorsementUpdate(salesExec.email, endorsement.ref, 'Declined');
            }
          }
        }
      }

      return updated;
    });
  }

  async getStats() {
    const [approvalPending, approvalInReview, completionPending, completionInReview] = await Promise.all([
      this.prisma.accountsQueueItem.count({ where: { type: 'APPROVAL', status: 'PENDING' } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'APPROVAL', status: 'IN_REVIEW' } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'COMPLETION', status: 'PENDING' } }),
      this.prisma.accountsQueueItem.count({ where: { type: 'COMPLETION', status: 'IN_REVIEW' } }),
    ]);

    return {
      approval: { pending: approvalPending, inReview: approvalInReview },
      completion: { pending: completionPending, inReview: completionInReview },
    };
  }

  /**
   * Auto-create UW assignment after invoice approval.
   * Traces: Invoice -> createdBy (sales exec) -> assignedUnderwriter
   * For NEW_POLICY: assigns the policy
   * For endorsements: assigns the endorsement
   */
  private async autoCreateUwAssignment(invoice: any, approvedByUserId: string) {
    // Find the sales exec who created the invoice and their mapped underwriter
    const salesExec = await this.prisma.user.findUnique({
      where: { id: invoice.createdById },
      select: { id: true, name: true, assignedUnderwriterId: true },
    });

    if (!salesExec?.assignedUnderwriterId) {
      this.logger.warn(`No underwriter mapped for sales exec ${salesExec?.name || invoice.createdById}. Skipping auto UW assignment.`);
      return;
    }

    // Determine what to assign: policy, invoice (new flow), or endorsement
    if (invoice.type === 'NEW_POLICY' && invoice.policyId) {
      // Existing flow: policy was created before invoice
      const existing = await this.prisma.uwAssignment.findFirst({
        where: { policyId: invoice.policyId, status: { in: ['QUEUED', 'IN_PROGRESS'] } },
      });
      if (existing) {
        this.logger.log(`UW assignment already exists for policy ${invoice.policyId}. Skipping.`);
        return;
      }

      await this.uwAssignments.create(
        { policyId: invoice.policyId, underwriterId: salesExec.assignedUnderwriterId, notes: `Auto-assigned after invoice ${invoice.invoiceNumber} approved` },
        approvedByUserId,
      );
      this.logger.log(`Auto-created UW assignment for policy ${invoice.policyId} -> underwriter ${salesExec.assignedUnderwriterId}`);
    } else if (invoice.type === 'NEW_POLICY' && !invoice.policyId) {
      // New flow: invoice created without a policy — UW will create the policy
      const existing = await this.prisma.uwAssignment.findFirst({
        where: { invoiceId: invoice.id, status: { in: ['QUEUED', 'IN_PROGRESS'] } },
      });
      if (existing) {
        this.logger.log(`UW assignment already exists for invoice ${invoice.id}. Skipping.`);
        return;
      }

      await this.uwAssignments.create(
        { invoiceId: invoice.id, customerIdId: invoice.customerIdId, underwriterId: salesExec.assignedUnderwriterId, notes: `Auto-assigned after invoice ${invoice.invoiceNumber} approved` },
        approvedByUserId,
      );
      this.logger.log(`Auto-created UW assignment for invoice ${invoice.invoiceNumber} (no policy yet) -> underwriter ${salesExec.assignedUnderwriterId}`);
    } else if (invoice.endorsementId) {
      // Check if UW assignment already exists for this endorsement
      const existing = await this.prisma.uwAssignment.findFirst({
        where: { endorsementId: invoice.endorsementId, status: { in: ['QUEUED', 'IN_PROGRESS'] } },
      });
      if (existing) {
        this.logger.log(`UW assignment already exists for endorsement ${invoice.endorsementId}. Skipping.`);
        return;
      }

      await this.uwAssignments.create(
        { endorsementId: invoice.endorsementId, underwriterId: salesExec.assignedUnderwriterId, notes: `Auto-assigned after invoice ${invoice.invoiceNumber} approved` },
        approvedByUserId,
      );
      this.logger.log(`Auto-created UW assignment for endorsement ${invoice.endorsementId} -> underwriter ${salesExec.assignedUnderwriterId}`);
    }
  }
}

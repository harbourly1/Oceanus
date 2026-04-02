import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@oceanus/shared';

@Injectable()
export class PolicyRenewalService {
  private readonly logger = new Logger(PolicyRenewalService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Daily at 9 AM: create renewal tasks for policies expiring within 45 days.
   * Excludes marine single-transit (CARGO with policyType "Single Transit").
   * Uses renewalTaskCreatedAt flag for deduplication.
   */
  @Cron('0 9 * * *')
  async handlePolicyRenewalTasks() {
    try {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

      const policies = await this.prisma.policy.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lte: cutoffDate, gt: now },
          renewalTaskCreatedAt: null,
        },
        include: {
          customerId: {
            include: {
              lead: {
                select: {
                  id: true,
                  ref: true,
                  productType: true,
                  formData: true,
                  assignedToId: true,
                  assignedTo: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (policies.length === 0) return;

      this.logger.log(`Processing renewal tasks for ${policies.length} expiring policy(ies)`);

      await Promise.allSettled(
        policies.map(async (policy) => {
          try {
            const lead = policy.customerId?.lead;
            if (!lead) {
              this.logger.warn(`Policy ${policy.ref}: no lead found, skipping`);
              return;
            }

            // Exclude marine single-transit policies
            if (policy.product === 'CARGO') {
              try {
                const formData = lead.formData ? JSON.parse(lead.formData) : {};
                if (formData.policyType === 'Single Transit') {
                  this.logger.log(`Policy ${policy.ref}: single transit CARGO, skipping renewal`);
                  return;
                }
              } catch {
                this.logger.warn(`Policy ${policy.ref}: failed to parse lead formData, skipping`);
                return;
              }
            }

            if (!lead.assignedToId) {
              this.logger.warn(`Policy ${policy.ref}: lead has no assigned sales exec, skipping`);
              return;
            }

            const expiryDateStr = policy.endDate.toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            });

            // Due date = 15 days before policy expiry (gives 30-day working window)
            const taskDueDate = new Date(policy.endDate.getTime() - 15 * 24 * 60 * 60 * 1000);
            // If due date is in the past, set it to tomorrow
            const effectiveDueDate = taskDueDate > now
              ? taskDueDate
              : new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Create task + stamp policy in a transaction
            await this.prisma.$transaction(async (tx) => {
              await tx.leadTask.create({
                data: {
                  leadId: lead.id,
                  title: `Policy Renewal: ${policy.ref}`,
                  description: `Policy ${policy.ref} expires on ${expiryDateStr}. Please initiate the renewal process.`,
                  dueDate: effectiveDueDate,
                  assignedToId: lead.assignedToId!,
                  createdById: lead.assignedToId!,
                  status: 'open',
                },
              });

              await tx.policy.update({
                where: { id: policy.id },
                data: { renewalTaskCreatedAt: new Date() },
              });
            });

            // Send notification
            this.notifications.create({
              type: NotificationType.TASK,
              title: 'Policy Renewal Task',
              body: `Policy ${policy.ref} expires on ${expiryDateStr}. A renewal task has been created.`,
              userId: lead.assignedToId,
              entityId: lead.id,
              entityType: 'lead',
            });

            // Send email
            if (lead.assignedTo?.email) {
              await this.email.sendTaskAssigned(
                lead.assignedTo.email,
                `Policy Renewal: ${policy.ref}`,
                lead.ref,
                lead.assignedTo.name,
              );
            }

            this.logger.log(`Created renewal task for policy ${policy.ref} (lead ${lead.ref})`);
          } catch (err) {
            this.logger.error(`Failed to create renewal task for policy ${policy.ref}: ${(err as Error).message}`);
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Policy renewal cron failed: ${(err as Error).message}`);
    }
  }
}

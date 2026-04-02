import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@oceanus/shared';

@Injectable()
export class TaskReminderService {
  private readonly logger = new Logger(TaskReminderService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Every 15 minutes: send reminders for tasks due within the next hour
   */
  @Cron('*/15 * * * *')
  async handleTaskReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const tasks = await this.prisma.leadTask.findMany({
        where: {
          status: 'open',
          reminderSent: false,
          dueDate: { gte: now, lte: oneHourFromNow },
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          lead: { select: { ref: true } },
        },
      });

      if (tasks.length === 0) return;

      this.logger.log(`Sending reminders for ${tasks.length} task(s) due within 1 hour`);

      await Promise.allSettled(
        tasks.map(async (task) => {
          try {
            // Send reminder email
            if (task.assignedTo?.email) {
              await this.email.sendTaskReminder(
                task.assignedTo.email,
                task.title,
                task.lead.ref,
                task.dueDate.toLocaleString(),
              );
            }

            // WebSocket notification
            this.notifications.create({
              type: NotificationType.TASK,
              title: 'Task Reminder',
              body: `Task "${task.title}" for lead ${task.lead.ref} is due in less than 1 hour`,
              userId: task.assignedToId,
              entityId: task.leadId,
              entityType: 'lead',
            });

            // Mark reminder as sent
            await this.prisma.leadTask.update({
              where: { id: task.id },
              data: { reminderSent: true },
            });
          } catch (err) {
            this.logger.error(`Failed to send reminder for task ${task.id}: ${(err as Error).message}`);
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Task reminder cron failed: ${(err as Error).message}`);
    }
  }

  /**
   * Daily at 8 AM: send overdue notifications for tasks past their due date
   */
  @Cron('0 8 * * *')
  async handleOverdueNotifications() {
    try {
      const now = new Date();

      const tasks = await this.prisma.leadTask.findMany({
        where: {
          status: 'open',
          overdueNotified: false,
          dueDate: { lt: now },
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          lead: { select: { ref: true } },
        },
      });

      if (tasks.length === 0) return;

      this.logger.log(`Sending overdue notifications for ${tasks.length} task(s)`);

      await Promise.allSettled(
        tasks.map(async (task) => {
          try {
            // Send overdue email
            if (task.assignedTo?.email) {
              await this.email.sendTaskOverdue(
                task.assignedTo.email,
                task.title,
                task.lead.ref,
                task.dueDate.toLocaleString(),
              );
            }

            // WebSocket notification
            this.notifications.create({
              type: NotificationType.TASK,
              title: 'Task Overdue',
              body: `Task "${task.title}" for lead ${task.lead.ref} is overdue`,
              userId: task.assignedToId,
              entityId: task.leadId,
              entityType: 'lead',
            });

            // Mark overdue notification as sent
            await this.prisma.leadTask.update({
              where: { id: task.id },
              data: { overdueNotified: true },
            });
          } catch (err) {
            this.logger.error(`Failed to send overdue notification for task ${task.id}: ${(err as Error).message}`);
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Overdue notification cron failed: ${(err as Error).message}`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@oceanus/shared';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async findByUser(userId: string, params?: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const { unreadOnly = false, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      unreadCount,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: {
    type: NotificationType;
    title: string;
    body: string;
    userId: string;
    entityId?: string;
    entityType?: string;
  }) {
    const notification = await this.prisma.notification.create({ data });

    // Push via WebSocket
    this.gateway.sendToUser(data.userId, notification);

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async notifyStatusChange(entityId: string, entityType: string, userId: string, ref: string, newStatus: string) {
    return this.create({
      type: NotificationType.STATUS_CHANGE,
      title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Status Updated`,
      body: `${ref} moved to ${newStatus}`,
      userId,
      entityId,
      entityType,
    });
  }

  async notifyInvoice(entityId: string, userId: string, invoiceNumber: string, action: string) {
    return this.create({
      type: NotificationType.INVOICE,
      title: `Invoice ${action}`,
      body: `Invoice ${invoiceNumber} has been ${action.toLowerCase()}`,
      userId,
      entityId,
      entityType: 'invoice',
    });
  }

  async notifyAllocation(leadId: string, userId: string, leadRef: string) {
    return this.create({
      type: NotificationType.ALLOCATION,
      title: 'New Lead Assigned',
      body: `Lead ${leadRef} has been assigned to you`,
      userId,
      entityId: leadId,
      entityType: 'lead',
    });
  }

  async notifyPolicyIssued(policyId: string, userId: string, policyRef: string) {
    return this.create({
      type: NotificationType.POLICY,
      title: 'Policy Issued',
      body: `Policy ${policyRef} has been issued`,
      userId,
      entityId: policyId,
      entityType: 'policy',
    });
  }

  async notifyEndorsement(endorsementId: string, userId: string, endorsementRef: string, action: string) {
    return this.create({
      type: NotificationType.ENDORSEMENT,
      title: `Endorsement ${action}`,
      body: `Endorsement ${endorsementRef} - ${action}`,
      userId,
      entityId: endorsementId,
      entityType: 'endorsement',
    });
  }

  async notifyUwAssignment(assignmentId: string, userId: string, ref: string) {
    return this.create({
      type: NotificationType.UW_ASSIGNMENT,
      title: 'New UW Assignment',
      body: `You have been assigned to process ${ref}`,
      userId,
      entityId: assignmentId,
      entityType: 'uw_assignment',
    });
  }

  async notifyAccountsQueue(queueItemId: string, userId: string, action: string) {
    return this.create({
      type: NotificationType.ACCOUNTS_QUEUE,
      title: `Queue Item ${action}`,
      body: `An accounts queue item requires your attention`,
      userId,
      entityId: queueItemId,
      entityType: 'accounts_queue',
    });
  }
}

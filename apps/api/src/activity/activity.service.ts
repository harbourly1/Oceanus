import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: {
    entityId: string;
    entityType: string;
    userId: string;
    action: string;
    detail?: string;
  }) {
    try {
      return await this.prisma.activity.create({
        data: {
          entityId: data.entityId,
          entityType: data.entityType,
          userId: data.userId,
          action: data.action,
          detail: data.detail || null,
        },
      });
    } catch (error) {
      // Activity logging should never break the main flow
      this.logger.warn(`Failed to log activity: ${(error as Error).message}`);
      return null;
    }
  }

  async findByEntity(entityId: string, entityType: string, params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { entityId, entityType },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { entityId, entityType } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByUser(userId: string, params?: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where: { userId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const { page = 1, limit = 50, entityType, action, userId, dateFrom, dateTo, search } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }
    if (search) where.detail = { contains: search };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getRecentActivity(limit = 10) {
    return this.prisma.activity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }
}

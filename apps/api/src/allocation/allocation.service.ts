import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  AllocationMethod,
  LEAD_TERMINAL_STATUSES,
} from '@oceanus/shared';

export interface AllocationResult {
  assigned: boolean;
  agentId?: string;
  agentName?: string;
  poolId?: string;
  poolName?: string;
  reason: string;
}

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Core Round-Robin Allocation ────────────────────────────────────────────

  async allocateLead(leadId: string): Promise<AllocationResult> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return { assigned: false, reason: 'Lead not found' };
    }

    // 1. Find matching pool by product type and language
    const pool = await this.findMatchingPool(lead.productType, lead.language);
    if (!pool) {
      this.logger.log(`No allocation pool matches product type '${lead.productType}' for lead ${lead.ref}`);
      return { assigned: false, reason: `No allocation pool configured for product type '${lead.productType}'` };
    }

    // 2. Get eligible agents (active, not on leave, under capacity)
    const eligible = await this.getEligibleAgents(pool);
    if (eligible.length === 0) {
      this.logger.log(`No eligible agents in pool '${pool.name}' for lead ${lead.ref}`);
      return {
        assigned: false,
        poolId: pool.id,
        poolName: pool.name,
        reason: 'No eligible agents available (all at capacity, on leave, or inactive)',
      };
    }

    // 3. Select next agent via round-robin (oldest lastAssignedAt)
    const winner = this.selectNextAgent(eligible);
    const now = new Date();

    // 4. Assign in a transaction
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: { assignedToId: winner.userId, lastActivityAt: now },
      }),
      this.prisma.allocationPoolAgent.update({
        where: { id: winner.id },
        data: { lastAssignedAt: now },
      }),
      this.prisma.leadAssignmentLog.create({
        data: {
          leadId,
          assignedToId: winner.userId,
          poolId: pool.id,
          method: AllocationMethod.ROUND_ROBIN,
          reason: `Auto-assigned via pool '${pool.name}'`,
        },
      }),
    ]);

    // 5. Notify the agent
    try {
      await this.notifications.create({
        type: NotificationType.LEAD_ASSIGNMENT,
        title: 'New Lead Assigned',
        body: `Lead ${lead.ref} (${lead.productType}) has been auto-assigned to you`,
        userId: winner.userId,
      });
    } catch (err) {
      this.logger.warn(`Failed to send notification for lead ${lead.ref}: ${(err as Error).message}`);
    }

    this.logger.log(`Lead ${lead.ref} assigned to agent ${winner.user?.name || winner.userId} via pool '${pool.name}'`);

    return {
      assigned: true,
      agentId: winner.userId,
      agentName: winner.user?.name,
      poolId: pool.id,
      poolName: pool.name,
      reason: `Assigned via round-robin pool '${pool.name}'`,
    };
  }

  async findMatchingPool(productType: string, language?: string) {
    const pools = await this.prisma.allocationPool.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const normalized = productType.toUpperCase();
    const lang = language || 'en';

    for (const pool of pools) {
      try {
        const types: string[] = JSON.parse(pool.productTypes);
        const languages: string[] = JSON.parse(pool.languages || '["en"]');
        const matchesProduct = types.map((t) => t.toUpperCase()).includes(normalized);
        const matchesLanguage = languages.includes(lang);
        if (matchesProduct && matchesLanguage) {
          return pool;
        }
      } catch {
        this.logger.warn(`Invalid JSON in pool ${pool.id}`);
      }
    }

    // Fallback: match product only if no language-specific pool found
    for (const pool of pools) {
      try {
        const types: string[] = JSON.parse(pool.productTypes);
        if (types.map((t) => t.toUpperCase()).includes(normalized)) {
          return pool;
        }
      } catch {
        // already warned above
      }
    }

    return null;
  }

  async getEligibleAgents(pool: { id: string; maxDailyLeads: number; maxWeeklyLeads: number }) {
    const agents = await this.prisma.allocationPoolAgent.findMany({
      where: { poolId: pool.id, isActive: true },
      include: { user: { select: { id: true, name: true, isActive: true, isOnLeave: true } } },
    });

    // Filter: user must be active and not on leave
    const active = agents.filter(
      (a) => a.user.isActive && !a.user.isOnLeave,
    );

    // Filter: must be under capacity
    const eligible: typeof active = [];
    for (const agent of active) {
      const underCapacity = await this.checkCapacity(agent.userId, pool);
      if (underCapacity) {
        eligible.push(agent);
      }
    }

    return eligible;
  }

  async checkCapacity(
    userId: string,
    pool: { maxDailyLeads: number; maxWeeklyLeads: number },
  ): Promise<boolean> {
    const now = new Date();

    // Start of today (UTC)
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Start of week (Monday UTC)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - diff);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const [dailyCount, weeklyCount] = await Promise.all([
      this.prisma.leadAssignmentLog.count({
        where: { assignedToId: userId, createdAt: { gte: startOfToday } },
      }),
      this.prisma.leadAssignmentLog.count({
        where: { assignedToId: userId, createdAt: { gte: startOfWeek } },
      }),
    ]);

    return dailyCount < pool.maxDailyLeads && weeklyCount < pool.maxWeeklyLeads;
  }

  selectNextAgent<T extends { lastAssignedAt: Date | null; createdAt: Date }>(agents: T[]): T {
    return agents.sort((a, b) => {
      const aTime = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
      const bTime = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
      if (aTime !== bTime) return aTime - bTime; // oldest first, nulls (0) first
      return a.createdAt.getTime() - b.createdAt.getTime(); // tie-break by creation order
    })[0];
  }

  // ─── Manual Assignment Logging ──────────────────────────────────────────────

  async logManualAssignment(leadId: string, assignedToId: string, assignedById: string) {
    await this.prisma.leadAssignmentLog.create({
      data: {
        leadId,
        assignedToId,
        assignedById,
        method: AllocationMethod.MANUAL,
        reason: 'Manually assigned',
      },
    });
  }

  // ─── Pool CRUD ──────────────────────────────────────────────────────────────

  async createPool(data: {
    name: string;
    productTypes: string[];
    languages?: string[];
    maxDailyLeads?: number;
    maxWeeklyLeads?: number;
    agentIds: string[];
  }) {
    // Validate all agents exist and have sales/admin role
    const users = await this.prisma.user.findMany({
      where: { id: { in: data.agentIds }, isActive: true },
      select: { id: true, role: true },
    });

    const validRoles = ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'];
    const validIds = users.filter((u) => validRoles.includes(u.role)).map((u) => u.id);

    if (validIds.length === 0) {
      throw new BadRequestException('No valid agents found. Agents must be active and have a sales or admin role.');
    }

    return this.prisma.$transaction(async (tx) => {
      const pool = await tx.allocationPool.create({
        data: {
          name: data.name,
          productTypes: JSON.stringify(data.productTypes),
          languages: JSON.stringify(data.languages || ['en']),
          maxDailyLeads: data.maxDailyLeads ?? 10,
          maxWeeklyLeads: data.maxWeeklyLeads ?? 50,
        },
      });

      await tx.allocationPoolAgent.createMany({
        data: validIds.map((userId) => ({
          poolId: pool.id,
          userId,
        })),
      });

      return tx.allocationPool.findUnique({
        where: { id: pool.id },
        include: {
          agents: { include: { user: { select: { id: true, name: true } } } },
        },
      });
    });
  }

  async updatePool(
    poolId: string,
    data: {
      name?: string;
      productTypes?: string[];
      languages?: string[];
      maxDailyLeads?: number;
      maxWeeklyLeads?: number;
      agentIds?: string[];
    },
  ) {
    const pool = await this.prisma.allocationPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Allocation pool not found');

    return this.prisma.$transaction(async (tx) => {
      // Update scalar fields
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.productTypes !== undefined) updateData.productTypes = JSON.stringify(data.productTypes);
      if (data.languages !== undefined) updateData.languages = JSON.stringify(data.languages);
      if (data.maxDailyLeads !== undefined) updateData.maxDailyLeads = data.maxDailyLeads;
      if (data.maxWeeklyLeads !== undefined) updateData.maxWeeklyLeads = data.maxWeeklyLeads;

      if (Object.keys(updateData).length > 0) {
        await tx.allocationPool.update({ where: { id: poolId }, data: updateData });
      }

      // Reconcile agents if provided
      if (data.agentIds !== undefined) {
        const existing = await tx.allocationPoolAgent.findMany({
          where: { poolId },
          select: { userId: true },
        });
        const existingIds = existing.map((e) => e.userId);

        // Remove agents no longer in the list
        const toRemove = existingIds.filter((id) => !data.agentIds!.includes(id));
        if (toRemove.length > 0) {
          await tx.allocationPoolAgent.deleteMany({
            where: { poolId, userId: { in: toRemove } },
          });
        }

        // Add new agents
        const toAdd = data.agentIds.filter((id) => !existingIds.includes(id));
        if (toAdd.length > 0) {
          await tx.allocationPoolAgent.createMany({
            data: toAdd.map((userId) => ({ poolId, userId })),
          });
        }
      }

      return tx.allocationPool.findUnique({
        where: { id: poolId },
        include: {
          agents: { include: { user: { select: { id: true, name: true } } } },
        },
      });
    });
  }

  async deletePool(poolId: string) {
    const pool = await this.prisma.allocationPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Allocation pool not found');

    // Soft delete
    return this.prisma.allocationPool.update({
      where: { id: poolId },
      data: { isActive: false },
    });
  }

  async findAllPools(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.allocationPool.findMany({
      where,
      include: {
        agents: {
          include: { user: { select: { id: true, name: true, isOnLeave: true } } },
        },
        _count: { select: { assignmentLogs: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findPoolById(poolId: string) {
    const pool = await this.prisma.allocationPool.findUnique({
      where: { id: poolId },
      include: {
        agents: {
          include: { user: { select: { id: true, name: true, isActive: true, isOnLeave: true } } },
        },
        _count: { select: { assignmentLogs: true } },
      },
    });
    if (!pool) throw new NotFoundException('Allocation pool not found');
    return pool;
  }

  // ─── Assignment Logs ────────────────────────────────────────────────────────

  async getAssignmentLogs(params: {
    page?: number;
    limit?: number;
    leadId?: string;
    assignedToId?: string;
    poolId?: string;
    method?: string;
  }) {
    const { page = 1, limit = 20, leadId, assignedToId, poolId, method } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (poolId) where.poolId = poolId;
    if (method) where.method = method;

    const [data, total] = await Promise.all([
      this.prisma.leadAssignmentLog.findMany({
        where,
        include: {
          lead: { select: { id: true, ref: true, productType: true, fullName: true } },
          assignedTo: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
          pool: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leadAssignmentLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Unassigned Leads Queue ─────────────────────────────────────────────────

  async getUnassignedLeads(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const terminalStatuses = LEAD_TERMINAL_STATUSES.map((s) => s as string);

    const where = {
      assignedToId: null as string | null,
      status: { notIn: terminalStatuses },
    };

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

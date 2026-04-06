import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { LeadScoringService } from './lead-scoring.service';
import { AllocationService } from '../allocation/allocation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { EmailService } from '../email/email.service';
import {
  LeadStatus,
  LeadTemperature,
  NotificationType,
  validateLeadTransition,
  LEAD_TERMINAL_STATUSES,
  HOT_THRESHOLD,
  WARM_THRESHOLD,
  TASK_RESPONSE_CONFIG,
  TaskResponseType,
} from '@oceanus/shared';


@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private scoring: LeadScoringService,
    private allocationService: AllocationService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
  ) {}

  private async generateRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.lead.count({
      where: { ref: { startsWith: `L-${year}-` } },
    });
    return `L-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(data: {
    productType: string;
    formData: any;
    quotesData?: any;
    selectedQuote?: any;
    fullName: string;
    email: string;
    phone?: string;
    company?: string;
    nationality?: string;
    residence?: string;
    contactPref?: string;
    currency?: string;
    language?: string;
    source?: string;
    status?: string;
  }) {
    if (!data.fullName || !data.email || !data.productType) {
      throw new BadRequestException('fullName, email, and productType are required');
    }

    // Check for existing active lead with same email + productType
    const existing = await this.prisma.lead.findUnique({
      where: { email_productType: { email: data.email, productType: data.productType } },
    });
    if (existing && !['lost', 'converted'].includes(existing.status)) {
      throw new BadRequestException(
        `An active lead already exists for ${data.email} with product type ${data.productType} (${existing.ref}). Update the existing lead or mark it as lost before creating a new one.`,
      );
    }
    // If existing lead is lost/converted, remove the old record so the unique slot is freed
    if (existing && ['lost', 'converted'].includes(existing.status)) {
      // Soft-free: update the old lead's email to make room for the new one
      await this.prisma.lead.update({
        where: { id: existing.id },
        data: { email: `${existing.email}__archived_${existing.id}` },
      });
    }

    const ref = await this.generateRef();
    const now = new Date();

    const formDataStr = typeof data.formData === 'string' ? data.formData : JSON.stringify(data.formData || {});

    const lead = await this.prisma.lead.create({
      data: {
        ref,
        productType: data.productType,
        formData: formDataStr,
        quotesData: data.quotesData ? (typeof data.quotesData === 'string' ? data.quotesData : JSON.stringify(data.quotesData)) : null,
        selectedQuote: data.selectedQuote ? (typeof data.selectedQuote === 'string' ? data.selectedQuote : JSON.stringify(data.selectedQuote)) : null,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        nationality: data.nationality || null,
        residence: data.residence || null,
        contactPref: data.contactPref || 'Email',
        currency: data.currency || 'AED',
        language: data.language || 'en',
        source: data.source || 'web',
        status: data.status || 'new',
        lastActivityAt: now,
      },
    });

    // Compute and save score
    const { score } = await this.scoring.computeScore({
      productType: data.productType,
      formData: formDataStr,
      phone: data.phone,
      company: data.company,
      nationality: data.nationality,
      residence: data.residence,
      documents: [],
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { score },
    });

    // Trigger auto-allocation (non-blocking)
    let allocationResult = null;
    try {
      allocationResult = await this.allocationService.allocateLead(lead.id);
    } catch (error) {
      this.logger.warn(`Auto-allocation failed for lead ${lead.id}: ${(error as Error).message}`);
    }

    return { lead_id: lead.id, lead_ref: lead.ref, score, allocation: allocationResult };
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    productType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    scoreMin?: number;
    scoreMax?: number;
    source?: string;
    assignedToId?: string;
    temperature?: string;
    currentUserId?: string;
    currentUserRole?: string;
  }) {
    const {
      page = 1, limit = 20, status, productType, search,
      sortBy = 'createdAt', sortOrder = 'desc',
      scoreMin, scoreMax, source, assignedToId, temperature,
      currentUserId, currentUserRole,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status;
    if (productType) where.productType = productType;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;

    // Role-based filtering: SALES_EXEC sees only own leads
    if (currentUserRole === 'SALES_EXEC' && currentUserId) {
      where.assignedToId = currentUserId;
    }

    if (temperature) {
      if (temperature === LeadTemperature.HOT) {
        where.score = { gte: HOT_THRESHOLD };
      } else if (temperature === LeadTemperature.WARM) {
        where.score = { gte: WARM_THRESHOLD, lt: HOT_THRESHOLD };
      } else if (temperature === LeadTemperature.COLD) {
        where.score = { lt: WARM_THRESHOLD };
      }
    }

    if (!temperature && (scoreMin !== undefined || scoreMax !== undefined)) {
      const min = scoreMin !== undefined ? Number(scoreMin) : undefined;
      const max = scoreMax !== undefined ? Number(scoreMax) : undefined;
      if ((min !== undefined && !isNaN(min)) || (max !== undefined && !isNaN(max))) {
        where.score = {};
        if (min !== undefined && !isNaN(min)) (where.score as any).gte = min;
        if (max !== undefined && !isNaN(max)) (where.score as any).lte = max;
      }
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { ref: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const orderBy: any = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          documents: true,
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy,
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

  async findById(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        documents: true,
        assignedTo: { select: { id: true, name: true } },
        customers: {
          include: {
            policies: true,
            endorsements: true,
            invoices: true,
          },
        },
        assignmentLogs: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            assignedBy: { select: { id: true, name: true } },
            pool: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async transitionStatus(
    id: string,
    status: string,
    userRole: string,
    note?: string,
    declineReason?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const fromStatus = lead.status as LeadStatus;
    const toStatus = status as LeadStatus;

    if (!validateLeadTransition(fromStatus, toStatus, userRole as any)) {
      throw new ForbiddenException(
        `Transition from '${fromStatus}' to '${toStatus}' is not allowed for role '${userRole}'`,
      );
    }

    if (toStatus === LeadStatus.LOST && !declineReason) {
      throw new BadRequestException('declineReason is required when transitioning to lost');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: toStatus,
        ...(note ? { statusNote: note } : {}),
        ...(declineReason ? { declineReason } : {}),
        lastActivityAt: new Date(),
      },
      include: {
        documents: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Activity log + notifications (non-blocking)
    if (updated.assignedToId) {
      this.activity.log({ entityId: id, entityType: 'lead', userId: updated.assignedToId, action: 'STATUS_CHANGE', detail: `${fromStatus} → ${toStatus}${note ? ': ' + note : ''}` });
      this.notifications.notifyStatusChange(id, 'lead', updated.assignedToId, updated.ref, toStatus);
      if (updated.assignedTo?.email) {
        this.email.sendLeadStatusChange(updated.assignedTo.email, updated.ref, toStatus);
      }
    }

    return updated;
  }

  async selectQuote(id: string, note?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (lead.status !== 'quoted' && lead.status !== 'selected' && lead.status !== 'new') {
      throw new BadRequestException('Quote selection is only available for new, quoted, or selected leads');
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: 'selected',
        ...(note ? { statusNote: note } : {}),
        lastActivityAt: new Date(),
      },
    });
  }

  async convertToCustomer(leadId: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Check if already converted
    const existingCustomer = await this.prisma.customerID.findFirst({
      where: { leadId },
    });
    if (existingCustomer) {
      throw new BadRequestException('Lead has already been converted to a customer');
    }

    if (lead.status === 'lost') {
      throw new BadRequestException('Cannot convert a lost lead');
    }

    if (!['quoted', 'selected'].includes(lead.status)) {
      throw new BadRequestException(
        `Lead must be in 'quoted' or 'selected' status to convert (currently '${lead.status}'). Ensure a quote has been provided before converting.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Generate Customer ID ref: C-L-XXXX-XXX
      const leadNum = lead.ref.replace('L-', '').replace(/-/g, '');
      const customerCount = await tx.customerID.count({
        where: { leadId },
      });
      const seq = String(customerCount + 1).padStart(3, '0');
      const customerRef = `C-${lead.ref}-${seq}`;

      // Create CustomerID
      const customer = await tx.customerID.create({
        data: {
          ref: customerRef,
          leadId,
          customerName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          nationality: lead.nationality,
          residence: lead.residence,
          contactPref: lead.contactPref,
          currency: lead.currency,
          language: lead.language,
          createdById: userId,
        },
      });

      // Update lead status to converted
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'converted',
          lastActivityAt: new Date(),
        },
      });

      return customer;
    }).then(async (customer) => {
      // Activity log
      this.activity.log({ entityId: leadId, entityType: 'lead', userId, action: 'CONVERTED', detail: `Converted to customer ${customer.ref}` });
      this.activity.log({ entityId: customer.id, entityType: 'customer', userId, action: 'CREATED', detail: `Customer ${customer.ref} created from lead` });
      return customer;
    });
  }

  async assignLead(leadId: string, assignedToId: string, assignedById?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const user = await this.prisma.user.findUnique({ where: { id: assignedToId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new BadRequestException('Cannot assign to inactive user');

    const salesRoles = ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'];
    if (!salesRoles.includes(user.role)) {
      throw new BadRequestException('Can only assign leads to sales executives, sales admins, or admins');
    }

    const result = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedToId,
        lastActivityAt: new Date(),
      },
      include: {
        documents: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (assignedById) {
      try {
        await this.allocationService.logManualAssignment(leadId, assignedToId, assignedById);
      } catch (error) {
        this.logger.warn(`Failed to log manual assignment for lead ${leadId}: ${(error as Error).message}`);
      }
    }

    // Notify assigned user + activity log
    this.activity.log({ entityId: leadId, entityType: 'lead', userId: assignedToId, action: 'ASSIGNED', detail: `Lead ${lead.ref} assigned` });
    this.notifications.notifyAllocation(leadId, assignedToId, lead.ref);
    this.email.sendLeadAssigned(user.email, lead.ref, user.name);

    return result;
  }

  async getStats(currentUserId?: string, currentUserRole?: string) {
    const where: Prisma.LeadWhereInput = {};
    // SALES_EXEC sees stats only for their own leads
    if (currentUserRole === 'SALES_EXEC' && currentUserId) {
      where.assignedToId = currentUserId;
    }

    const allLeads = await this.prisma.lead.findMany({
      where,
      select: { status: true, source: true, score: true },
    });

    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byTemperature: Record<string, number> = { hot: 0, warm: 0, cold: 0 };

    for (const lead of allLeads) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
      if (lead.score >= HOT_THRESHOLD) byTemperature.hot++;
      else if (lead.score >= WARM_THRESHOLD) byTemperature.warm++;
      else byTemperature.cold++;
    }

    return { total: allLeads.length, byStatus, bySource, byTemperature };
  }

  async uploadDocument(leadId: string, file: { originalname: string; mimetype: string; size: number; filename: string; url: string }) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const doc = await this.prisma.leadDocument.create({
      data: {
        leadId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: file.url,
      },
    });

    // Recompute score with documents bonus
    const updatedLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { documents: true },
    });
    if (updatedLead) {
      const { score } = await this.scoring.computeScore({
        productType: updatedLead.productType,
        formData: updatedLead.formData,
        phone: updatedLead.phone,
        company: updatedLead.company,
        nationality: updatedLead.nationality,
        residence: updatedLead.residence,
        documents: updatedLead.documents,
      });
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { score, lastActivityAt: new Date() },
      });
    }

    return doc;
  }

  async updateLead(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      company?: string;
      nationality?: string;
      residence?: string;
      contactPref?: string;
      currency?: string;
      language?: string;
      source?: string;
    },
    userId: string,
  ) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    const changedFields: string[] = [];
    const updateData: any = {};

    const fields = [
      'fullName', 'email', 'phone', 'company', 'nationality',
      'residence', 'contactPref', 'currency', 'language', 'source',
    ] as const;

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== existing[field]) {
        updateData[field] = data[field];
        changedFields.push(field);
      }
    }

    if (changedFields.length === 0) return existing;

    updateData.lastActivityAt = new Date();

    const updated = await this.prisma.lead.update({
      where: { id },
      data: updateData,
    });

    this.activity.log({
      entityId: id,
      entityType: 'lead',
      userId,
      action: 'EDITED',
      detail: `Lead ${existing.ref} contact info updated: ${changedFields.join(', ')}`,
    });

    return updated;
  }

  // ─── Lead Notes ──────────────────────────────────────────────────────────────

  async addNote(leadId: string, content: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const note = await this.prisma.leadNote.create({
      data: { leadId, content, createdById: userId },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { lastActivityAt: new Date() },
    });

    this.activity.log({
      entityId: leadId,
      entityType: 'lead',
      userId,
      action: 'NOTE_ADDED',
      detail: content,
    });

    return note;
  }

  async getNotes(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadNote.findMany({
      where: { leadId },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteNote(leadId: string, noteId: string, userId: string, userRole: string) {
    const note = await this.prisma.leadNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.leadId !== leadId) throw new BadRequestException('Note does not belong to this lead');

    if (note.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.prisma.leadNote.delete({ where: { id: noteId } });

    this.activity.log({
      entityId: leadId,
      entityType: 'lead',
      userId,
      action: 'NOTE_DELETED',
      detail: 'Note removed',
    });

    return { success: true };
  }

  // ─── Lead Activities ─────────────────────────────────────────────────────────

  async getLeadActivities(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.activity.findByEntity(leadId, 'lead');
  }

  // ─── Temperature Override ────────────────────────────────────────────────────

  async overrideTemperature(
    leadId: string,
    temperature: string | null,
    reason: string | undefined,
    userId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (temperature !== null && !['hot', 'warm', 'cold'].includes(temperature)) {
      throw new BadRequestException('Temperature must be hot, warm, cold, or null (auto)');
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        temperatureOverride: temperature,
        lastActivityAt: new Date(),
      },
    });

    const detail = temperature
      ? `Temperature manually set to ${temperature.toUpperCase()}${reason ? ': ' + reason : ''}`
      : `Temperature reset to auto-calculated${reason ? ': ' + reason : ''}`;

    this.activity.log({
      entityId: leadId,
      entityType: 'lead',
      userId,
      action: 'TEMPERATURE_OVERRIDE',
      detail,
    });

    return updated;
  }

  // ─── Lead Tasks ───────────────────────────────────────────────────────────────

  async createTask(
    leadId: string,
    data: { title: string; description?: string; dueDate: string; assignedToId: string },
    userId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (['converted', 'lost'].includes(lead.status)) {
      throw new BadRequestException(`Cannot create tasks on a ${lead.status} lead`);
    }

    const task = await this.prisma.leadTask.create({
      data: {
        leadId,
        title: data.title,
        description: data.description || null,
        dueDate: new Date(data.dueDate),
        assignedToId: data.assignedToId,
        createdById: userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { lastActivityAt: new Date() },
    });

    this.activity.log({
      entityId: leadId, entityType: 'lead', userId,
      action: 'TASK_CREATED', detail: `Task "${data.title}" created`,
    });

    if (data.assignedToId !== userId) {
      this.notifications.create({
        type: NotificationType.TASK,
        title: 'New Task Assigned',
        body: `Task "${data.title}" for lead ${lead.ref}`,
        entityId: leadId,
        entityType: 'lead',
        userId: data.assignedToId,
      });
      if (task.assignedTo?.email) {
        this.email.sendTaskAssigned(task.assignedTo.email, data.title, lead.ref, task.assignedTo.name);
      }
    }

    return task;
  }

  async updateTask(
    taskId: string,
    data: { title?: string; description?: string; dueDate?: string; assignedToId?: string; status?: string },
    userId: string,
  ) {
    const task = await this.prisma.leadTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed') updateData.completedAt = new Date();
      else updateData.completedAt = null;
    }

    const updated = await this.prisma.leadTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const action = data.status === 'completed' ? 'TASK_COMPLETED' : 'TASK_UPDATED';
    this.activity.log({
      entityId: task.leadId, entityType: 'lead', userId,
      action, detail: `Task "${updated.title}" ${action === 'TASK_COMPLETED' ? 'completed' : 'updated'}`,
    });

    return updated;
  }

  async deleteTask(taskId: string, userId: string, userRole: string) {
    const task = await this.prisma.leadTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (task.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own tasks');
    }

    await this.prisma.leadTask.delete({ where: { id: taskId } });

    this.activity.log({
      entityId: task.leadId, entityType: 'lead', userId,
      action: 'TASK_DELETED', detail: `Task "${task.title}" deleted`,
    });

    return { success: true };
  }

  async getTasksByLead(leadId: string, params: { page?: number; limit?: number; status?: string }) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const { page = 1, limit = 50, status } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.LeadTaskWhereInput = { leadId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.leadTask.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leadTask.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getTaskStats(userId: string, userRole: string, scope: string) {
    const where: Prisma.LeadTaskWhereInput = { status: 'open' };

    // Scope filtering
    if (scope === 'mine' || userRole === 'SALES_EXEC') {
      where.assignedToId = userId;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);
    const last30Start = new Date(todayStart.getTime() - 30 * 86400000);

    const baseWhere = { ...where };

    const [all, today, yesterday, last30, older30, tomorrow] = await Promise.all([
      this.prisma.leadTask.count({ where: baseWhere }),
      this.prisma.leadTask.count({ where: { ...baseWhere, dueDate: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.leadTask.count({ where: { ...baseWhere, dueDate: { gte: yesterdayStart, lt: todayStart } } }),
      this.prisma.leadTask.count({ where: { ...baseWhere, dueDate: { gte: last30Start, lt: todayEnd } } }),
      this.prisma.leadTask.count({ where: { ...baseWhere, dueDate: { lt: last30Start } } }),
      this.prisma.leadTask.count({ where: { ...baseWhere, dueDate: { gte: todayEnd, lt: tomorrowEnd } } }),
    ]);

    return { all, today, yesterday, last30, older30, tomorrow };
  }

  async getLeadsWithTasks(userId: string, userRole: string, params: {
    page?: number; limit?: number; search?: string;
    timePeriod?: string; scope?: string;
    dueDateFrom?: string; dueDateTo?: string;
  }) {
    const { page = 1, limit = 20, search, timePeriod = 'all', scope = 'mine', dueDateFrom, dueDateTo } = params;
    const skip = (page - 1) * limit;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 86400000);
    const last30Start = new Date(todayStart.getTime() - 30 * 86400000);

    // Build task date filter based on timePeriod
    let taskDateFilter: Prisma.LeadTaskWhereInput = {};
    switch (timePeriod) {
      case 'today': taskDateFilter = { dueDate: { gte: todayStart, lt: todayEnd } }; break;
      case 'yesterday': taskDateFilter = { dueDate: { gte: yesterdayStart, lt: todayStart } }; break;
      case 'last30': taskDateFilter = { dueDate: { gte: last30Start, lt: todayEnd } }; break;
      case 'older30': taskDateFilter = { dueDate: { lt: last30Start } }; break;
      case 'tomorrow': taskDateFilter = { dueDate: { gte: todayEnd, lt: tomorrowEnd } }; break;
    }

    // Custom date range override
    if (dueDateFrom || dueDateTo) {
      const dateRange: any = {};
      if (dueDateFrom) dateRange.gte = new Date(dueDateFrom);
      if (dueDateTo) dateRange.lte = new Date(dueDateTo);
      taskDateFilter = { dueDate: dateRange };
    }

    // Build the lead where clause
    const leadWhere: Prisma.LeadWhereInput = {};

    // Scope filtering
    if (scope === 'mine' || userRole === 'SALES_EXEC') {
      leadWhere.assignedToId = userId;
    }

    // Search
    if (search) {
      leadWhere.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { ref: { contains: search } },
        { company: { contains: search } },
      ];
    }

    // Only show leads that have open tasks matching the time filter
    leadWhere.tasks = {
      some: {
        status: 'open',
        ...taskDateFilter,
      },
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: leadWhere,
        include: {
          assignedTo: { select: { id: true, name: true } },
          customers: { select: { id: true } },
          tasks: {
            where: { status: 'open', ...taskDateFilter },
            orderBy: { dueDate: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where: leadWhere }),
    ]);

    const data = leads.map((lead) => ({
      id: lead.id,
      ref: lead.ref,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      assignedTo: lead.assignedTo,
      openTaskCount: lead.tasks.length,
      nextDueDate: lead.tasks.length > 0 ? lead.tasks[0].dueDate.toISOString() : null,
      hasCustomers: lead.customers.length > 0,
      createdAt: lead.createdAt.toISOString(),
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async respondToTask(
    taskId: string,
    data: { responseType: string; notes?: string; followUpDueDate?: string; lostReason?: string; transferredToId?: string },
    userId: string,
  ) {
    const task = await this.prisma.leadTask.findUnique({
      where: { id: taskId },
      include: { lead: true, assignedTo: { select: { id: true, name: true, email: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'open') throw new BadRequestException('Task is already completed');

    const responseLabel = (TASK_RESPONSE_CONFIG as any)[data.responseType]?.label || data.responseType;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Complete the current task with response data
      const updatedTask = await tx.leadTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          responseType: data.responseType,
          responseNotes: data.notes || null,
          lostReason: data.lostReason || null,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // 2. If follow-up date provided (and not a transfer — transfer creates its own handoff task), create a new chained task
      let followUpTask = null;
      if (data.followUpDueDate && data.responseType !== TaskResponseType.TRANSFERRED) {
        followUpTask = await tx.leadTask.create({
          data: {
            leadId: task.leadId,
            title: `Follow-up: ${responseLabel}`,
            dueDate: new Date(data.followUpDueDate),
            assignedToId: task.assignedToId,
            createdById: userId,
            parentTaskId: taskId,
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
        });
      }

      // 3. Update lead activity timestamp
      await tx.lead.update({
        where: { id: task.leadId },
        data: { lastActivityAt: new Date() },
      });

      return { updatedTask, followUpTask };
    });

    // Log activity
    this.activity.log({
      entityId: task.leadId, entityType: 'lead', userId,
      action: 'TASK_RESPONDED', detail: `Task "${task.title}" — response: ${responseLabel}`,
    });

    // If lost lead, attempt to transition lead status
    if (data.responseType === TaskResponseType.LOST_LEAD) {
      try {
        await this.transitionStatus(task.leadId, LeadStatus.LOST, 'ADMIN', undefined, data.lostReason);
      } catch {
        // Non-fatal: lead may already be in a terminal state
      }
    }

    // If redundant lead, auto-transition to lost with reason 'duplicate'
    if (data.responseType === TaskResponseType.REDUNDANT_LEAD) {
      try {
        await this.transitionStatus(task.leadId, LeadStatus.LOST, 'ADMIN', 'Marked redundant via task response', 'duplicate');
      } catch {
        // Non-fatal: lead may already be in a terminal state
      }
    }

    // If transferred, reassign lead and create a new task for the new agent
    if (data.responseType === TaskResponseType.TRANSFERRED && data.transferredToId) {
      try {
        await this.assignLead(task.leadId, data.transferredToId, userId);
      } catch (err) {
        this.logger.error(`Failed to reassign lead ${task.leadId} during transfer: ${(err as Error).message}`);
        throw new BadRequestException(`Transfer failed: ${(err as Error).message}`);
      }

      // Create a handoff task for the new agent
      await this.prisma.leadTask.create({
        data: {
          leadId: task.leadId,
          title: `Follow-up: Transferred from ${task.assignedTo?.name || 'previous agent'}`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToId: data.transferredToId,
          createdById: userId,
          parentTaskId: taskId,
        },
      });

      // Send transfer email to the new agent
      const targetUser = await this.prisma.user.findUnique({
        where: { id: data.transferredToId },
        select: { email: true, name: true },
      });
      if (targetUser?.email) {
        this.email.sendLeadTransferred(targetUser.email, task.lead.ref, task.assignedTo?.name || 'Unknown', targetUser.name);
      }

      // WebSocket notification for new agent
      this.notifications.create({
        type: NotificationType.TASK,
        title: 'Lead Transferred to You',
        body: `Lead ${task.lead.ref} has been transferred to you from ${task.assignedTo?.name || 'previous agent'}`,
        entityId: task.leadId,
        entityType: 'lead',
        userId: data.transferredToId,
      });
    }

    // Auto-advance lead status based on task response (only if lead isn't already at or past the target status)
    const currentLeadStatus = task.lead.status;
    const statusOrder = ['new', 'contacted', 'quoted', 'selected', 'converted'];
    const currentIdx = statusOrder.indexOf(currentLeadStatus);

    if (data.responseType === TaskResponseType.CALLBACK || data.responseType === TaskResponseType.NO_ANSWER || data.responseType === TaskResponseType.TOO_EARLY) {
      // These responses imply customer contact was attempted → advance to 'contacted' if still at 'new'
      if (currentIdx < statusOrder.indexOf('contacted')) {
        try {
          await this.transitionStatus(task.leadId, LeadStatus.CONTACTED, 'ADMIN');
        } catch { /* Non-fatal */ }
      }
    }

    if (data.responseType === TaskResponseType.QUOTATION_SENT) {
      // Quotation sent → advance to 'quoted' if still at 'new' or 'contacted'
      if (currentIdx < statusOrder.indexOf('quoted')) {
        try {
          await this.transitionStatus(task.leadId, LeadStatus.QUOTED, 'ADMIN');
        } catch { /* Non-fatal */ }
      }
    }

    // Notify assignee of follow-up task if created by someone else
    if (result.followUpTask && task.assignedToId !== userId) {
      this.notifications.create({
        type: NotificationType.TASK,
        title: 'Follow-up Task Created',
        body: `Follow-up: ${responseLabel} for lead ${task.lead.ref}`,
        entityId: task.leadId,
        entityType: 'lead',
        userId: task.assignedToId,
      });
    }

    return result;
  }
}

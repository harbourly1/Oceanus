import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  private async generateRef(leadRef: string, leadId: string): Promise<string> {
    const count = await this.prisma.customerID.count({ where: { leadId } });
    const seq = String(count + 1).padStart(3, '0');
    // Format: C-L-YYYY-XXXX-XXX (strip the L- prefix and re-add)
    const leadPart = leadRef.replace('L-', '');
    return `C-L-${leadPart}-${seq}`;
  }

  async createFromLead(leadId: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (lead.status === 'lost') {
      throw new BadRequestException('Cannot create customer from a lost lead');
    }

    const ref = await this.generateRef(lead.ref, leadId);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customerID.create({
        data: {
          ref,
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

      // If lead is in selected status, move to converted
      if (lead.status === 'selected' || lead.status === 'quoted') {
        await tx.lead.update({
          where: { id: leadId },
          data: { status: 'converted', lastActivityAt: new Date() },
        });
      }

      return customer;
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerIDWhereInput = {};
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { email: { contains: search } },
        { ref: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customerID.findMany({
        where,
        include: {
          lead: { select: { id: true, ref: true, productType: true, status: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { policies: true, endorsements: true, invoices: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.customerID.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const customer = await this.prisma.customerID.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, ref: true, productType: true, status: true } },
        createdBy: { select: { id: true, name: true } },
        policies: {
          include: { issuedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        endorsements: {
          include: {
            policy: { select: { id: true, ref: true } },
            requestedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByLead(leadId: string) {
    return this.prisma.customerID.findMany({
      where: { leadId },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { policies: true, endorsements: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCustomer(
    id: string,
    data: {
      customerName?: string;
      email?: string;
      phone?: string;
      company?: string;
      nationality?: string;
      residence?: string;
      contactPref?: string;
      currency?: string;
      language?: string;
    },
    userId: string,
  ) {
    const existing = await this.prisma.customerID.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    const changedFields: string[] = [];
    const updateData: any = {};

    const fields = [
      'customerName', 'email', 'phone', 'company', 'nationality',
      'residence', 'contactPref', 'currency', 'language',
    ] as const;

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== existing[field]) {
        updateData[field] = data[field];
        changedFields.push(field);
      }
    }

    if (changedFields.length === 0) return existing;

    const updated = await this.prisma.customerID.update({
      where: { id },
      data: updateData,
    });

    this.activity.log({
      entityId: id,
      entityType: 'customer',
      userId,
      action: 'EDITED',
      detail: `Customer ${existing.customerName} updated: ${changedFields.join(', ')}`,
    });

    return updated;
  }
}

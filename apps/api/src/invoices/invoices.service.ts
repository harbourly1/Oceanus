import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InvoiceType, INVOICE_SUFFIX_MAP, VAT_RATE } from '@oceanus/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { EmailService } from '../email/email.service';

function parseDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00');
  return new Date(d);
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private email: EmailService,
  ) {}

  /**
   * Generate invoice number based on type:
   * NEW_POLICY:   INV-YYYY-XXXX
   * CANCELLATION: INV-YYYY-XXXX-C
   * EXTENSION:    INV-YYYY-XXXX-EXT-N
   * NAME_CHANGE:  INV-YYYY-XXXX-NC-N
   * ADDON:        INV-YYYY-XXXX-A-N
   */
  private async generateInvoiceNumber(type: InvoiceType, policyId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const suffix = INVOICE_SUFFIX_MAP[type] || '';

    if (type === InvoiceType.NEW_POLICY) {
      const count = await this.prisma.invoice.count({
        where: { type: InvoiceType.NEW_POLICY, invoiceNumber: { startsWith: `INV-${year}-` } },
      });
      return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // For endorsement types, find the base invoice number and append suffix + seq
    const baseInvoice = policyId
      ? await this.prisma.invoice.findFirst({
          where: { policyId, type: InvoiceType.NEW_POLICY },
          select: { invoiceNumber: true },
        })
      : null;

    const base = baseInvoice?.invoiceNumber || `INV-${year}-0000`;

    // Count existing invoices of same type for same policy to get sequence
    const seqCount = policyId
      ? await this.prisma.invoice.count({ where: { policyId, type } })
      : 0;

    if (type === InvoiceType.CANCELLATION) {
      return `${base}-C`;
    }

    return `${base}${suffix}-${seqCount + 1}`;
  }

  async create(data: {
    customerIdId: string;
    policyId?: string;
    endorsementId?: string;
    type: string;
    amount: number;
    receiptAmount?: number;
    paymentDate?: string;
    paymentMode?: string;
    installment?: boolean;
    installmentDetails?: string;
    receiptPath?: string;
    currency?: string;
    dueDate: string;
    policyPurchaseType?: string;
    notes?: string;
  }, userId: string) {
    const customer = await this.prisma.customerID.findUnique({ where: { id: data.customerIdId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const invoiceType = data.type as InvoiceType;
    const invoiceNumber = await this.generateInvoiceNumber(invoiceType, data.policyId);
    const vat = data.amount * VAT_RATE;
    const total = data.amount + vat;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerIdId: data.customerIdId,
        policyId: data.policyId || null,
        endorsementId: data.endorsementId || null,
        type: invoiceType,
        amount: data.amount,
        receiptAmount: data.receiptAmount ?? null,
        vat,
        total,
        currency: data.currency || customer.currency,
        status: 'PENDING_APPROVAL',
        dueDate: parseDate(data.dueDate),
        paymentDate: data.paymentDate ? parseDate(data.paymentDate) : null,
        paymentMode: data.paymentMode || null,
        installment: data.installment ?? false,
        installmentDetails: data.installmentDetails || null,
        receiptPath: data.receiptPath || null,
        policyPurchaseType: data.policyPurchaseType || null,
        notes: data.notes || null,
        createdById: userId,
      },
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Auto-create AccountsQueueItem for approval
    await this.prisma.accountsQueueItem.create({
      data: {
        type: 'APPROVAL',
        invoiceId: invoice.id,
        endorsementId: data.endorsementId || null,
        status: 'PENDING',
      },
    });

    // Activity log + notify accountants
    this.activity.log({ entityId: invoice.id, entityType: 'invoice', userId, action: 'CREATED', detail: `Invoice ${invoice.invoiceNumber} created (${invoiceType})` });
    // Notify all accountants about new invoice pending approval
    const accountants = await this.prisma.user.findMany({ where: { role: 'ACCOUNTANT', isActive: true }, select: { id: true, email: true, name: true } });
    for (const acc of accountants) {
      this.notifications.notifyInvoice(invoice.id, acc.id, invoice.invoiceNumber, 'Pending Approval');
      this.email.sendInvoiceAction(acc.email, invoice.invoiceNumber, 'Pending Approval');
    }

    return invoice;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    customerIdId?: string;
    createdById?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, status, type, customerIdId, createdById, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (customerIdId) where.customerIdId = customerIdId;
    if (createdById) where.createdById = createdById;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerId: { customerName: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customerId: { select: { id: true, ref: true, customerName: true } },
          policy: { select: { id: true, ref: true, insurer: true } },
          endorsement: { select: { id: true, ref: true, type: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customerId: true,
        policy: { select: { id: true, ref: true, product: true, insurer: true } },
        endorsement: { select: { id: true, ref: true, type: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async approve(id: string, userId: string, notes?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        ...(notes ? { notes } : {}),
      },
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
      },
    });

    // Activity log + notify invoice creator
    this.activity.log({ entityId: id, entityType: 'invoice', userId, action: 'APPROVED', detail: `Invoice ${invoice.invoiceNumber} approved` });
    this.notifications.notifyInvoice(id, invoice.createdById, invoice.invoiceNumber, 'Approved');
    const creator = await this.prisma.user.findUnique({ where: { id: invoice.createdById }, select: { email: true } });
    if (creator) this.email.sendInvoiceAction(creator.email, invoice.invoiceNumber, 'Approved');

    return updated;
  }

  async decline(id: string, userId: string, remarks?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'DECLINED',
        remarks: remarks || null,
        declinedAt: new Date(),
        approvedById: userId,
      },
      include: {
        customerId: { select: { id: true, ref: true, customerName: true } },
      },
    });

    // Activity log + notify invoice creator
    this.activity.log({ entityId: id, entityType: 'invoice', userId, action: 'DECLINED', detail: `Invoice ${invoice.invoiceNumber} declined${remarks ? ': ' + remarks : ''}` });
    this.notifications.notifyInvoice(id, invoice.createdById, invoice.invoiceNumber, 'Declined');
    const creator = await this.prisma.user.findUnique({ where: { id: invoice.createdById }, select: { email: true } });
    if (creator) this.email.sendInvoiceAction(creator.email, invoice.invoiceNumber, 'Declined');

    return updated;
  }

  async updateStatus(id: string, status: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
    });
  }
}

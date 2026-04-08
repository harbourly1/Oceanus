import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, limit = 5) {
    const q = query.trim();
    if (q.length < 2) {
      return { leads: [], customers: [], policies: [] };
    }

    const [leads, customers, policies] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { ref: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, ref: true, fullName: true, status: true, productType: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

      this.prisma.customerID.findMany({
        where: {
          OR: [
            { customerName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { ref: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, ref: true, customerName: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

      this.prisma.policy.findMany({
        where: {
          OR: [
            { ref: { contains: q, mode: 'insensitive' } },
            { policyNumber: { contains: q, mode: 'insensitive' } },
            { insurer: { contains: q, mode: 'insensitive' } },
            { customerId: { customerName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          ref: true,
          policyNumber: true,
          insurer: true,
          product: true,
          customerId: { select: { id: true, ref: true, customerName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return { leads, customers, policies };
  }
}

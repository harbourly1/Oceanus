import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsurersService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.insurer.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.insurer.findUnique({
      where: { id },
      include: {
        rateTables: { where: { isActive: true }, include: { product: true } },
        commissionSchedules: { where: { isActive: true }, include: { product: true } },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.insurer.findUnique({ where: { code } });
  }

  async create(data: any) {
    return this.prisma.insurer.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.insurer.update({ where: { id }, data });
  }
}

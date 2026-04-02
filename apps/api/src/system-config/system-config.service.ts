import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getByKey(key: string) {
    return this.prisma.systemConfig.findUnique({ where: { key } });
  }

  async upsert(key: string, value: string, label?: string, category?: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, ...(label !== undefined ? { label } : {}), ...(category !== undefined ? { category } : {}) },
      create: { key, value, label: label || key, category: category || 'general' },
    });
  }
}

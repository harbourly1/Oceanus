import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceDataService {
  constructor(private prisma: PrismaService) {}

  async findByCategory(category: string) {
    return this.prisma.referenceData.findMany({
      where: { category, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllCategories() {
    const rows = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    }
    return grouped;
  }

  async getPublicReferenceData() {
    const rows = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: { category: true, code: true, label: true },
    });
    const grouped: Record<string, string[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row.code);
    }
    return grouped;
  }

  async create(data: { category: string; code: string; label: string; sortOrder?: number }) {
    return this.prisma.referenceData.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.referenceData.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.referenceData.update({ where: { id }, data: { isActive: false } });
  }

  // ─── CSV Export ──────────────────────────────────────────────────────────

  async exportCsv(): Promise<string> {
    const rows = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: { category: true, code: true, label: true, sortOrder: true },
    });
    const header = 'category,code,label,sortOrder';
    const lines = rows.map(r =>
      `${this.csvEscape(r.category)},${this.csvEscape(r.code)},${this.csvEscape(r.label)},${r.sortOrder}`,
    );
    return [header, ...lines].join('\n');
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ─── CSV Import ──────────────────────────────────────────────────────────

  async importCsv(csvContent: string): Promise<{ created: number; skipped: number; errors: string[] }> {
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { created: 0, skipped: 0, errors: ['CSV must have a header row and at least one data row'] };

    // Parse header
    const header = this.parseCsvLine(lines[0]);
    const catIdx = header.indexOf('category');
    const codeIdx = header.indexOf('code');
    const labelIdx = header.indexOf('label');
    const sortIdx = header.indexOf('sortOrder');

    if (catIdx === -1 || codeIdx === -1 || labelIdx === -1) {
      return { created: 0, skipped: 0, errors: ['CSV must have category, code, and label columns'] };
    }

    // Get existing entries for deduplication
    const existing = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      select: { category: true, code: true },
    });
    const existingSet = new Set(existing.map(e => `${e.category}::${e.code}`));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = this.parseCsvLine(lines[i]);
      const category = fields[catIdx]?.trim();
      const code = fields[codeIdx]?.trim();
      const label = fields[labelIdx]?.trim();
      const sortOrder = sortIdx >= 0 ? parseInt(fields[sortIdx]) || 0 : 0;

      if (!category || !code || !label) {
        errors.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      const key = `${category}::${code}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      try {
        await this.prisma.referenceData.create({ data: { category, code, label, sortOrder } });
        existingSet.add(key);
        created++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message?.substring(0, 80)}`);
      }
    }

    return { created, skipped, errors };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  }
}

import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReferenceDataService } from './reference-data.service';
import { ActivityService } from '../activity/activity.service';

@ApiTags('Reference Data')
@Controller('reference-data')
export class ReferenceDataController {
  constructor(
    private refService: ReferenceDataService,
    private activity: ActivityService,
  ) {}

  // ─── Public (no auth — for landing page dropdowns) ────────────────────────

  @Get('public')
  @ApiOperation({ summary: 'Get all reference data grouped by category (public)' })
  async getPublic() {
    return this.refService.getPublicReferenceData();
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all reference data grouped by category' })
  async findAll() {
    return this.refService.findAllCategories();
  }

  // ─── CSV Export / Import (must be before :category param route) ──────────

  @Get('export/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="reference-data.csv"')
  @ApiOperation({ summary: 'Export all reference data as CSV' })
  async exportCsv() {
    return this.refService.exportCsv();
  }

  @Post('import/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Import reference data from CSV content' })
  async importCsv(@Body() body: { csv: string }, @CurrentUser('id') userId: string) {
    const result = await this.refService.importCsv(body.csv);
    if (result.created > 0) {
      this.activity.log({ entityId: 'bulk', entityType: 'reference_data', userId, action: 'CREATED', detail: `CSV import: ${result.created} created, ${result.skipped} skipped` });
    }
    return result;
  }

  @Get(':category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get reference data by category' })
  async findByCategory(@Param('category') category: string) {
    return this.refService.findByCategory(category);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a reference data entry' })
  async create(@Body() body: { category: string; code: string; label: string; sortOrder?: number }, @CurrentUser('id') userId: string) {
    const entry = await this.refService.create(body);
    this.activity.log({ entityId: entry.id, entityType: 'reference_data', userId, action: 'CREATED', detail: `${body.category} / ${body.code} — ${body.label} added` });
    return entry;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a reference data entry' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    const entry = await this.refService.update(id, body);
    this.activity.log({ entityId: id, entityType: 'reference_data', userId, action: 'EDITED', detail: `${entry.category} / ${entry.code} updated` });
    return entry;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete a reference data entry' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const entry = await this.refService.remove(id);
    this.activity.log({ entityId: id, entityType: 'reference_data', userId, action: 'DELETED', detail: `${entry.category} / ${entry.code} removed` });
    return entry;
  }
}

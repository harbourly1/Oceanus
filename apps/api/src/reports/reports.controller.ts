import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('admin-dashboard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  async getAdminDashboard() {
    return this.reportsService.getAdminDashboard();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get role-specific dashboard stats' })
  async getDashboard(
    @CurrentUser('role') userRole: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.getDashboard(userRole, userId);
  }

  @Get('master/export')
  @Roles('SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Export master report as CSV' })
  async exportMasterReport(
    @Res() res: Response,
    @Query('product') product?: string,
    @Query('status') status?: string,
    @Query('insurer') insurer?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('salesExecutiveId') salesExecutiveId?: string,
    @Query('underwriterId') underwriterId?: string,
  ) {
    const csv = await this.reportsService.getMasterReportCsv({
      product, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId,
    });
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="master-report-${date}.csv"`);
    res.send(csv);
  }

  @Get('production/export')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Export production report as CSV' })
  async exportProductionReport(
    @Res() res: Response,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('insurer') insurer?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('salesExecutiveId') salesExecutiveId?: string,
    @Query('underwriterId') underwriterId?: string,
  ) {
    const csv = await this.reportsService.getProductionReportCsv({
      type, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId,
    });
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="production-report-${date}.csv"`);
    res.send(csv);
  }

  @Get('master')
  @Roles('SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Master report (all policies, premiums, commissions)' })
  async getMasterReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('product') product?: string,
    @Query('status') status?: string,
    @Query('insurer') insurer?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('salesExecutiveId') salesExecutiveId?: string,
    @Query('underwriterId') underwriterId?: string,
  ) {
    return this.reportsService.getMasterReport({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      product, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId,
    });
  }

  @Get('production')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Accountant production report (invoices, approvals)' })
  async getProductionReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('insurer') insurer?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('salesExecutiveId') salesExecutiveId?: string,
    @Query('underwriterId') underwriterId?: string,
  ) {
    return this.reportsService.getProductionReport({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type, status, insurer, dateFrom, dateTo, salesExecutiveId, underwriterId,
    });
  }
}

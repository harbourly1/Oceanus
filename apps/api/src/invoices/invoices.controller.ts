import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Create invoice' })
  async create(
    @Body() body: {
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
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicesService.create(body, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('customerIdId') customerIdId?: string,
    @Query('createdById') createdById?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.invoicesService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status, type, customerIdId, createdById, search, sortBy, sortOrder,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail' })
  async findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  @Patch(':id/approve')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Approve invoice' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { notes?: string },
  ) {
    return this.invoicesService.approve(id, userId, body.notes);
  }

  @Patch(':id/decline')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Decline invoice with remarks' })
  async decline(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { remarks?: string },
  ) {
    return this.invoicesService.decline(id, userId, body.remarks);
  }

  @Patch(':id/status')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Update invoice status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.invoicesService.updateStatus(id, body.status);
  }
}

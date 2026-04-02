import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PoliciesService } from './policies.service';

@ApiTags('Policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private policiesService: PoliciesService) {}

  @Post()
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create policy record' })
  async create(@Body() body: {
    customerIdId: string;
    insurer: string;
    product: string;
    premium: number;
    sumInsured: number;
    commission?: number;
    commissionRate?: number;
    startDate: string;
    endDate: string;
  }) {
    return this.policiesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List policies' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('product') product?: string,
    @Query('customerIdId') customerIdId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.policiesService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status, product, customerIdId, search, sortBy, sortOrder,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy detail' })
  async findById(@Param('id') id: string) {
    return this.policiesService.findById(id);
  }

  @Patch(':id/status')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Update policy status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; policyDocument?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.policiesService.updateStatus(id, body.status, userId, body.policyDocument);
  }

  @Patch(':id')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Update policy fields and documents' })
  async updateFields(
    @Param('id') id: string,
    @Body() body: {
      policyNumber?: string;
      policyHolderName?: string;
      premiumCharged?: number;
      sumInsured?: number;
      startDate?: string;
      endDate?: string;
      debitNoteNumber?: string;
      debitNoteAmount?: number;
      debitNotePath?: string;
      creditNoteNumber?: string;
      creditNoteAmount?: number;
      creditNotePath?: string;
      policyDocument?: string;
      policySchedule?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.policiesService.updateFields(id, body, userId);
  }
}

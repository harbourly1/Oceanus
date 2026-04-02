import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create Customer ID from lead' })
  async create(
    @Body() body: { leadId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.createFromLead(body.leadId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.customersService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('by-lead/:leadId')
  @ApiOperation({ summary: 'Get customers for a lead' })
  async findByLead(@Param('leadId') leadId: string) {
    return this.customersService.findByLead(leadId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer detail' })
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update customer details' })
  async update(
    @Param('id') id: string,
    @Body() body: {
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
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.updateCustomer(id, body, userId);
  }
}

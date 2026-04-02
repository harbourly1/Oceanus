import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EndorsementsService } from './endorsements.service';

@ApiTags('Endorsements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('endorsements')
export class EndorsementsController {
  constructor(private endorsementsService: EndorsementsService) {}

  @Post()
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create endorsement request' })
  async create(
    @Body() body: { policyId: string; type: string; details?: string; effectiveDate?: string; reason?: string; financialImpact?: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.endorsementsService.create(body, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List endorsements' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('policyId') policyId?: string,
    @Query('customerIdId') customerIdId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.endorsementsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status, type, policyId, customerIdId, search, sortBy, sortOrder,
    });
  }

  @Get('by-policy/:policyId')
  @ApiOperation({ summary: 'Get endorsements for a policy' })
  async findByPolicy(@Param('policyId') policyId: string) {
    return this.endorsementsService.findByPolicy(policyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get endorsement detail' })
  async findById(@Param('id') id: string) {
    return this.endorsementsService.findById(id);
  }

  @Patch(':id/status')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ACCOUNTANT', 'UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Transition endorsement status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.endorsementsService.updateStatus(id, body.status, userId);
  }

  @Patch(':id')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Update endorsement fields and documents' })
  async updateFields(
    @Param('id') id: string,
    @Body() body: {
      creditNoteNumber?: string;
      creditNoteAmount?: number;
      creditNotePath?: string;
      cancellationLetterPath?: string;
      refundCalculationPath?: string;
      revisedDocumentPath?: string;
      effectiveDate?: string;
      financialImpact?: number;
      debitNoteNumber?: string;
      debitNoteAmount?: number;
      debitNotePath?: string;
      cancellationDate?: string;
      endorsementCertificatePath?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.endorsementsService.updateFields(id, body, userId);
  }
}

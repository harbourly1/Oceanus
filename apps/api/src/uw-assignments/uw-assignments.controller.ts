import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UwAssignmentsService } from './uw-assignments.service';

@ApiTags('UW Assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uw-assignments')
export class UwAssignmentsController {
  constructor(private uwService: UwAssignmentsService) {}

  @Post()
  @Roles('UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Create UW assignment' })
  async create(
    @Body() body: { policyId?: string; endorsementId?: string; underwriterId: string; notes?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.uwService.create(body, userId);
  }

  @Get('queue')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get UW queue' })
  async getQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('underwriterId') underwriterId?: string,
  ) {
    return this.uwService.findQueue({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      underwriterId,
    });
  }

  @Get(':id')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get UW assignment detail' })
  async findById(@Param('id') id: string) {
    return this.uwService.findById(id);
  }

  @Patch(':id/start')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Start review' })
  async startReview(@Param('id') id: string) {
    return this.uwService.startReview(id);
  }

  @Patch(':id/complete')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Complete assignment (issue policy / process endorsement)' })
  async complete(
    @Param('id') id: string,
    @Body() body: {
      notes?: string;
      policyNumber?: string;
      policyHolderName?: string;
      premiumCharged?: number;
      policyDocument?: string;
      policySchedule?: string;
      debitNoteNumber?: string;
      debitNoteAmount?: number;
      debitNotePath?: string;
      creditNoteNumber?: string;
      creditNoteAmount?: number;
      creditNotePath?: string;
      startDate?: string;
      endDate?: string;
      sumInsured?: number;
      cancellationLetterPath?: string;
      refundCalculationPath?: string;
      revisedDocumentPath?: string;
      effectiveDate?: string;
      financialImpact?: number;
      cancellationDate?: string;
      endorsementCertificatePath?: string;
    },
  ) {
    return this.uwService.complete(id, body);
  }

  @Patch(':id/return')
  @Roles('UNDERWRITER', 'UW_MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Return assignment for revision' })
  async returnAssignment(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.uwService.returnAssignment(id, body.notes);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllocationService } from './allocation.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('allocation')
export class AllocationController {
  constructor(private allocationService: AllocationService) {}

  // ─── Pool CRUD ──────────────────────────────────────────────────────────────

  @Post('pools')
  @Roles('SALES_ADMIN', 'ADMIN')
  createPool(
    @Body() body: { name: string; productTypes: string[]; languages?: string[]; maxDailyLeads?: number; maxWeeklyLeads?: number; agentIds: string[] },
  ) {
    return this.allocationService.createPool(body);
  }

  @Get('pools')
  @Roles('SALES_ADMIN', 'ADMIN')
  findAllPools(@Query('includeInactive') includeInactive?: string) {
    return this.allocationService.findAllPools(includeInactive === 'true');
  }

  @Get('pools/:id')
  @Roles('SALES_ADMIN', 'ADMIN')
  findPoolById(@Param('id') id: string) {
    return this.allocationService.findPoolById(id);
  }

  @Patch('pools/:id')
  @Roles('SALES_ADMIN', 'ADMIN')
  updatePool(
    @Param('id') id: string,
    @Body() body: { name?: string; productTypes?: string[]; languages?: string[]; maxDailyLeads?: number; maxWeeklyLeads?: number; agentIds?: string[] },
  ) {
    return this.allocationService.updatePool(id, body);
  }

  @Delete('pools/:id')
  @Roles('SALES_ADMIN', 'ADMIN')
  deletePool(@Param('id') id: string) {
    return this.allocationService.deletePool(id);
  }

  // ─── Assignment Logs ────────────────────────────────────────────────────────

  @Get('logs')
  @Roles('SALES_ADMIN', 'ADMIN')
  getAssignmentLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('leadId') leadId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('poolId') poolId?: string,
    @Query('method') method?: string,
  ) {
    return this.allocationService.getAssignmentLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      leadId,
      assignedToId,
      poolId,
      method,
    });
  }

  // ─── Unassigned Leads Queue ─────────────────────────────────────────────────

  @Get('unassigned')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  getUnassignedLeads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.allocationService.getUnassignedLeads({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ─── Manual Allocation Trigger ──────────────────────────────────────────────

  @Post('allocate/:leadId')
  @Roles('SALES_ADMIN', 'ADMIN')
  retryAllocation(@Param('leadId') leadId: string) {
    return this.allocationService.allocateLead(leadId);
  }
}

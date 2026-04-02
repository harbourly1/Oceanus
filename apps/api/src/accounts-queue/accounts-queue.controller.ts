import {
  Controller, Get, Patch, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountsQueueService } from './accounts-queue.service';

@ApiTags('Accounts Queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts-queue')
export class AccountsQueueController {
  constructor(private queueService: AccountsQueueService) {}

  @Get('approval')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Get approval queue items' })
  async getApprovalQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.queueService.findByType('APPROVAL', {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get('completion')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Get cancellation queue items' })
  async getCompletionQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.queueService.findByType('COMPLETION', {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get('stats')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getStats() {
    return this.queueService.getStats();
  }

  @Get(':id')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Get queue item detail' })
  async findById(@Param('id') id: string) {
    return this.queueService.findById(id);
  }

  @Patch(':id/process')
  @Roles('ACCOUNTANT', 'ADMIN')
  @ApiOperation({ summary: 'Process queue item (approve/reject/complete)' })
  async process(
    @Param('id') id: string,
    @Body() body: { action: string; notes?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.queueService.processItem(id, body.action, userId, body.notes);
  }
}

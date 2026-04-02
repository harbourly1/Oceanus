import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all activities (paginated, filterable)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.activityService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      entityType,
      action,
      userId,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get('recent')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get recent system-wide activity' })
  async getRecent(@Query('limit') limit?: string) {
    return this.activityService.getRecentActivity(limit ? Number(limit) : 10);
  }
}

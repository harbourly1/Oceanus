import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsurersService } from './insurers.service';
import { ActivityService } from '../activity/activity.service';

@ApiTags('Insurers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insurers')
export class InsurersController {
  constructor(
    private insurersService: InsurersService,
    private activity: ActivityService,
  ) {}

  @Get()
  @Roles('ADMIN', 'SALES_ADMIN', 'SALES_EXEC', 'UNDERWRITER', 'ACCOUNTS')
  @ApiOperation({ summary: 'List all insurers' })
  async findAll(@Query('active') active?: string) {
    return this.insurersService.findAll(active !== 'false');
  }

  @Get(':id')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'Get insurer with rates and commissions' })
  async findOne(@Param('id') id: string) {
    return this.insurersService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new insurer' })
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    const insurer = await this.insurersService.create(body);
    this.activity.log({ entityId: insurer.id, entityType: 'insurer', userId, action: 'CREATED', detail: `Insurer ${insurer.code} — ${insurer.name} created` });
    return insurer;
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an insurer' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    const insurer = await this.insurersService.update(id, body);
    this.activity.log({ entityId: id, entityType: 'insurer', userId, action: 'EDITED', detail: `Insurer ${insurer.code} updated` });
    return insurer;
  }
}

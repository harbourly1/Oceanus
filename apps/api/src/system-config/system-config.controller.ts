import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemConfigService } from './system-config.service';

@ApiTags('System Config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system-config')
export class SystemConfigController {
  constructor(private configService: SystemConfigService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all system configuration' })
  async getAll() {
    return this.configService.getAll();
  }

  @Patch(':key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a system configuration value' })
  async upsert(
    @Param('key') key: string,
    @Body() body: { value: string; label?: string; category?: string },
  ) {
    return this.configService.upsert(key, body.value, body.label, body.category);
  }
}

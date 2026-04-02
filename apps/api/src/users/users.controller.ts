import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UserRole } from '@oceanus/shared';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  async findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll({ role });
  }

  @Get('underwriters')
  @ApiOperation({ summary: 'List underwriters for allocation' })
  async findUnderwriters() {
    return this.usersService.findUnderwriters();
  }

  @Get('sales-agents')
  @ApiOperation({ summary: 'List sales agents' })
  async findSalesAgents() {
    return this.usersService.findSalesAgents();
  }

  @Get('team-mappings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get sales exec to underwriter mappings' })
  async getTeamMappings() {
    return this.usersService.getTeamMappings();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/leave')
  @Roles('SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update user leave status' })
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body() body: { isOnLeave: boolean },
  ) {
    return this.usersService.updateLeaveStatus(id, body.isOnLeave);
  }

  @Patch(':id/assign-underwriter')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign an underwriter to a sales executive' })
  async assignUnderwriter(
    @Param('id') id: string,
    @Body() body: { underwriterId: string | null },
  ) {
    return this.usersService.assignUnderwriter(id, body.underwriterId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @Body() body: { email: string; password: string; name: string; role: string; department: string; language?: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.createUser(body, adminId);
  }

  @Patch(':id/reset-password')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.resetPassword(id, body.password, adminId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user details' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; role?: string; department?: string; language?: string; isActive?: boolean },
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.updateUser(id, body, adminId);
  }
}

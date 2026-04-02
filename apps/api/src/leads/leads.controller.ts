import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a new lead (public)' })
  async create(@Body() body: {
    productType: string;
    formData: any;
    quotesData?: any;
    selectedQuote?: any;
    fullName: string;
    email: string;
    phone?: string;
    company?: string;
    nationality?: string;
    residence?: string;
    contactPref?: string;
    currency?: string;
    language?: string;
    source?: string;
    status?: string;
  }) {
    return this.leadsService.create(body);
  }

  @Get('stats')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get lead statistics' })
  async getStats(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.leadsService.getStats(userId, userRole);
  }

  // ─── Lead Tasks (must be before :id route) ─────────────────────────────────

  @Get('tasks')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List leads with tasks (Leads & Tasks page)' })
  async getLeadsWithTasks(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('timePeriod') timePeriod?: string,
    @Query('scope') scope?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
  ) {
    return this.leadsService.getLeadsWithTasks(userId, userRole, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search, timePeriod, scope, dueDateFrom, dueDateTo,
    });
  }

  @Get('tasks/stats')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get task statistics by time period' })
  async getTaskStats(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('scope') scope?: string,
  ) {
    return this.leadsService.getTaskStats(userId, userRole, scope || 'mine');
  }

  @Patch('tasks/:taskId')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update a task' })
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() body: { title?: string; description?: string; dueDate?: string; assignedToId?: string; status?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.updateTask(taskId, body, userId);
  }

  @Delete('tasks/:taskId')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a task' })
  async deleteTask(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.leadsService.deleteTask(taskId, userId, userRole);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with pagination' })
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('productType') productType?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('scoreMin') scoreMin?: number,
    @Query('scoreMax') scoreMax?: number,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('temperature') temperature?: string,
  ) {
    return this.leadsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      productType,
      search,
      sortBy,
      sortOrder,
      scoreMin: scoreMin !== undefined ? Number(scoreMin) : undefined,
      scoreMax: scoreMax !== undefined ? Number(scoreMax) : undefined,
      source,
      assignedToId,
      temperature,
      currentUserId: user.id,
      currentUserRole: user.role,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Post(':id/convert')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Convert lead to Customer ID' })
  async convertToCustomer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.convertToCustomer(id, userId);
  }

  @Patch(':id/status')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Transition lead status' })
  async transitionStatus(
    @Param('id') id: string,
    @CurrentUser('role') userRole: string,
    @Body() body: { status: string; note?: string; declineReason?: string },
  ) {
    return this.leadsService.transitionStatus(id, body.status, userRole, body.note, body.declineReason);
  }

  @Public()
  @Patch(':id/select')
  @ApiOperation({ summary: 'Select quote for lead (public - landing page)' })
  async selectQuote(
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.leadsService.selectQuote(id, body.note);
  }

  @Post(':id/assign')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign lead to agent' })
  async assignLead(
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.assignLead(id, body.assignedToId, userId);
  }

  @Public()
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/leads',
      filename: (_req, file, cb) => {
        const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document to lead (public)' })
  async uploadDocument(
    @Param('id') leadId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.leadsService.uploadDocument(leadId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      filename: file.filename,
    });
  }

  // ─── Lead Notes ──────────────────────────────────────────────────────────────

  @Get(':id/notes')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get notes for a lead' })
  async getNotes(@Param('id') id: string) {
    return this.leadsService.getNotes(id);
  }

  @Post(':id/notes')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Add a note to a lead' })
  async addNote(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.addNote(id, body.content, userId);
  }

  @Delete(':id/notes/:noteId')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a lead note' })
  async deleteNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.leadsService.deleteNote(id, noteId, userId, userRole);
  }

  // ─── Lead Activities ────────────────────────────────────────────────────────

  @Get(':id/activities')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get activity log for a lead' })
  async getLeadActivities(@Param('id') id: string) {
    return this.leadsService.getLeadActivities(id);
  }

  // ─── Temperature Override ───────────────────────────────────────────────────

  @Patch(':id/temperature')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Override lead temperature' })
  async overrideTemperature(
    @Param('id') id: string,
    @Body() body: { temperature: string | null; reason?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.overrideTemperature(id, body.temperature, body.reason, userId);
  }

  // ─── Per-Lead Tasks ────────────────────────────────────────────────────────

  @Get(':id/tasks')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get tasks for a lead' })
  async getTasksByLead(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.leadsService.getTasksByLead(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Post(':id/tasks')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a task for a lead' })
  async createTask(
    @Param('id') id: string,
    @Body() body: { title: string; description?: string; dueDate: string; assignedToId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.createTask(id, body, userId);
  }

  @Post(':id/tasks/:taskId/respond')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Respond to a task and optionally create follow-up' })
  async respondToTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { responseType: string; notes?: string; followUpDueDate?: string; lostReason?: string; transferredToId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.respondToTask(taskId, body, userId);
  }

  @Patch(':id')
  @Roles('SALES_EXEC', 'SALES_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update lead contact details' })
  async updateLead(
    @Param('id') id: string,
    @Body() body: {
      fullName?: string;
      email?: string;
      phone?: string;
      company?: string;
      nationality?: string;
      residence?: string;
      contactPref?: string;
      currency?: string;
      language?: string;
      source?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.updateLead(id, body, userId);
  }
}

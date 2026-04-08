import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { UserRole } from '@oceanus/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    department: true,
    avatar: true,
    language: true,
    isActive: true,
    isOnLeave: true,
    assignedUnderwriterId: true,
    createdAt: true,
    updatedAt: true,
  };

  async findAll(filters?: { role?: UserRole; isActive?: boolean }) {
    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.user.findMany({
      where,
      select: this.userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMe(userId: string) {
    return this.findById(userId);
  }

  async updateLeaveStatus(userId: string, isOnLeave: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnLeave },
      select: { id: true, name: true, isOnLeave: true },
    });
  }

  async findUnderwriters() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.UNDERWRITER, UserRole.UW_MANAGER] },
        isActive: true,
      },
      select: this.userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findSalesAgents() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN] },
        isActive: true,
      },
      select: {
        ...this.userSelect,
        assignedUnderwriter: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTeamMappings() {
    const salesAgents = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.SALES_EXEC, UserRole.SALES_ADMIN] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedUnderwriterId: true,
        assignedUnderwriter: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { name: 'asc' },
    });

    const underwriters = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.UNDERWRITER, UserRole.UW_MANAGER] },
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return { salesAgents, underwriters };
  }

  async assignUnderwriter(salesExecId: string, underwriterId: string | null) {
    const salesExec = await this.prisma.user.findUnique({ where: { id: salesExecId } });
    if (!salesExec) throw new NotFoundException('Sales executive not found');
    if (![UserRole.SALES_EXEC, UserRole.SALES_ADMIN].includes(salesExec.role as UserRole)) {
      throw new BadRequestException('User is not a sales executive');
    }

    if (underwriterId) {
      const uw = await this.prisma.user.findUnique({ where: { id: underwriterId } });
      if (!uw) throw new NotFoundException('Underwriter not found');
      if (![UserRole.UNDERWRITER, UserRole.UW_MANAGER].includes(uw.role as UserRole)) {
        throw new BadRequestException('Assigned user must be an underwriter');
      }
    }

    return this.prisma.user.update({
      where: { id: salesExecId },
      data: { assignedUnderwriterId: underwriterId },
      select: {
        id: true,
        name: true,
        assignedUnderwriterId: true,
        assignedUnderwriter: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createUser(
    data: {
      email: string;
      password: string;
      name: string;
      role: string;
      department: string;
      language?: string;
    },
    adminId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        department: data.department,
        language: data.language || 'en',
      },
      select: this.userSelect,
    });

    this.activity.log({
      entityId: user.id,
      entityType: 'user',
      userId: adminId,
      action: 'CREATED',
      detail: `User ${user.name} (${user.role}) created`,
    });

    return user;
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: string;
      department?: string;
      language?: string;
      isActive?: boolean;
    },
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (data.isActive === false && id === adminId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    // Guard: block deactivation of underwriter with open assignments or mapped sales execs
    if (data.isActive === false && user.isActive && [UserRole.UNDERWRITER, UserRole.UW_MANAGER].includes(user.role as UserRole)) {
      const [openAssignments, mappedSalesExecs] = await Promise.all([
        this.prisma.uwAssignment.count({
          where: { underwriterId: id, status: { in: ['QUEUED', 'IN_PROGRESS'] } },
        }),
        this.prisma.user.count({
          where: { assignedUnderwriterId: id, isActive: true },
        }),
      ]);

      const blockers: string[] = [];
      if (openAssignments > 0) blockers.push(`${openAssignments} open UW assignment(s)`);
      if (mappedSalesExecs > 0) blockers.push(`${mappedSalesExecs} sales exec(s) mapped to this underwriter`);

      if (blockers.length > 0) {
        throw new BadRequestException(
          `Cannot deactivate underwriter "${user.name}": ${blockers.join(' and ')}. ` +
          `Transfer all assignments and remap sales executives first.`,
        );
      }
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new BadRequestException('Email already in use');
    }

    const updateData: any = {};
    const changedFields: string[] = [];
    if (data.name !== undefined && data.name !== user.name) { updateData.name = data.name; changedFields.push('name'); }
    if (data.email !== undefined && data.email !== user.email) { updateData.email = data.email; changedFields.push('email'); }
    if (data.role !== undefined && data.role !== user.role) { updateData.role = data.role; changedFields.push('role'); }
    if (data.department !== undefined && data.department !== user.department) { updateData.department = data.department; changedFields.push('department'); }
    if (data.language !== undefined && data.language !== user.language) { updateData.language = data.language; changedFields.push('language'); }
    if (data.isActive !== undefined && data.isActive !== user.isActive) { updateData.isActive = data.isActive; changedFields.push('isActive'); }

    if (changedFields.length === 0) return { ...user, password: undefined };

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelect,
    });

    const action = changedFields.includes('isActive')
      ? 'STATUS_CHANGE'
      : 'EDITED';
    const detail = changedFields.includes('isActive') && !data.isActive
      ? `User ${user.name} deactivated`
      : changedFields.includes('isActive') && data.isActive
        ? `User ${user.name} activated`
        : `User ${user.name} updated: ${changedFields.join(', ')}`;

    this.activity.log({
      entityId: id,
      entityType: 'user',
      userId: adminId,
      action,
      detail,
    });

    return updated;
  }

  async transferUnderwriter(
    fromId: string,
    targetId: string,
    adminId: string,
  ) {
    const fromUw = await this.prisma.user.findUnique({ where: { id: fromId } });
    if (!fromUw) throw new NotFoundException('Source underwriter not found');
    if (![UserRole.UNDERWRITER, UserRole.UW_MANAGER].includes(fromUw.role as UserRole)) {
      throw new BadRequestException('Source user is not an underwriter');
    }

    const toUw = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!toUw) throw new NotFoundException('Target underwriter not found');
    if (![UserRole.UNDERWRITER, UserRole.UW_MANAGER].includes(toUw.role as UserRole)) {
      throw new BadRequestException('Target user is not an underwriter');
    }
    if (!toUw.isActive) {
      throw new BadRequestException('Target underwriter is not active');
    }
    if (fromId === targetId) {
      throw new BadRequestException('Source and target underwriter cannot be the same');
    }

    // Reassign all open UW assignments
    const assignmentsUpdated = await this.prisma.uwAssignment.updateMany({
      where: { underwriterId: fromId, status: { in: ['QUEUED', 'IN_PROGRESS'] } },
      data: { underwriterId: targetId },
    });

    // Remap all active sales execs
    const salesExecsUpdated = await this.prisma.user.updateMany({
      where: { assignedUnderwriterId: fromId, isActive: true },
      data: { assignedUnderwriterId: targetId },
    });

    this.activity.log({
      entityId: fromId,
      entityType: 'user',
      userId: adminId,
      action: 'TRANSFER',
      detail: `Transferred ${assignmentsUpdated.count} assignment(s) and ${salesExecsUpdated.count} sales exec(s) from ${fromUw.name} to ${toUw.name}`,
    });

    return {
      assignmentsTransferred: assignmentsUpdated.count,
      salesExecsRemapped: salesExecsUpdated.count,
      from: { id: fromUw.id, name: fromUw.name },
      to: { id: toUw.id, name: toUw.name },
    };
  }

  async resetPassword(id: string, newPassword: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    this.activity.log({
      entityId: id,
      entityType: 'user',
      userId: adminId,
      action: 'PASSWORD_RESET',
      detail: `Password reset for ${user.name}`,
    });

    return { message: 'Password reset successfully' };
  }
}

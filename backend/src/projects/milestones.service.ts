import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueMilestones() {
    try {
      const result = await this.prisma.projectMilestone.updateMany({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: { status: 'OVERDUE' },
      });
      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} milestones as OVERDUE`);
      }
    } catch (error) {
      this.logger.warn(`Failed to update overdue milestones: ${error.message}`);
    }
  }

  async findAll(tenantId: string, projectId: string, locale: string) {
    await this.verifyProjectAccess(tenantId, projectId, locale);

    return this.prisma.projectMilestone.findMany({
      where: { tenantId, projectId },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async findOne(tenantId: string, projectId: string, id: string, locale: string) {
    await this.verifyProjectAccess(tenantId, projectId, locale);

    const milestone = await this.prisma.projectMilestone.findFirst({
      where: { id, tenantId, projectId },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    if (!milestone) {
      throw new NotFoundException(this.i18n.translate('projects.errors.milestoneNotFound', {}, locale));
    }

    return milestone;
  }

  async create(tenantId: string, projectId: string, userId: string, dto: CreateMilestoneDto, locale: string) {
    await this.verifyProjectAccess(tenantId, projectId, locale);

    const maxSort = await this.prisma.projectMilestone.aggregate({
      where: { tenantId, projectId },
      _max: { sortOrder: true },
    });

    const milestone = await this.prisma.projectMilestone.create({
      data: {
        tenantId,
        projectId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        status: dto.status || 'PENDING',
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder || 0) + 1,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    await this.auditLog(tenantId, userId, 'MILESTONE_CREATED', 'PROJECT', projectId, {
      milestoneId: milestone.id,
      title: dto.title,
      dueDate: dto.dueDate,
    });

    return milestone;
  }

  async update(tenantId: string, projectId: string, id: string, userId: string, dto: UpdateMilestoneDto, locale: string) {
    await this.verifyProjectAccess(tenantId, projectId, locale);

    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id, tenantId, projectId },
    });

    if (!existing) {
      throw new NotFoundException(this.i18n.translate('projects.errors.milestoneNotFound', {}, locale));
    }

    const milestone = await this.prisma.projectMilestone.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.completedAt !== undefined && { completedAt: dto.completedAt ? new Date(dto.completedAt) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    await this.auditLog(tenantId, userId, 'MILESTONE_UPDATED', 'PROJECT', projectId, {
      milestoneId: id,
      changes: dto,
    });

    return milestone;
  }

  async remove(tenantId: string, projectId: string, id: string, userId: string, locale: string) {
    await this.verifyProjectAccess(tenantId, projectId, locale);

    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id, tenantId, projectId },
    });

    if (!existing) {
      throw new NotFoundException(this.i18n.translate('projects.errors.milestoneNotFound', {}, locale));
    }

    await this.prisma.projectMilestone.delete({ where: { id } });

    await this.auditLog(tenantId, userId, 'MILESTONE_DELETED', 'PROJECT', projectId, {
      milestoneId: id,
      title: existing.title,
    });

    return { success: true };
  }

  private async verifyProjectAccess(tenantId: string, projectId: string, locale: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) {
      throw new NotFoundException(this.i18n.translate('projects.errors.notFound', {}, locale));
    }
    return project;
  }

  private async auditLog(tenantId: string, userId: string, action: string, module: string, recordId: string, newValues?: any) {
    try {
      await this.prisma.auditLog.create({
        data: { tenantId, userId, action, module, recordId, newValues },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }
  }
}

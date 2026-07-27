import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateDprDto, UpdateDprDto } from './dto/dpr.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DailyProgressReportsService {
  private readonly logger = new Logger(DailyProgressReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: { page?: number; limit?: number; startDate?: string; endDate?: string }, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, siteId };

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.reportDate = dateFilter;
    }

    const [reports, total] = await Promise.all([
      this.prisma.dailyProgressReport.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true } },
          photos: { select: { id: true, fileUrl: true, caption: true } },
          _count: { select: { photos: true } },
        },
        orderBy: { reportDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dailyProgressReport.count({ where }),
    ]);

    return {
      data: reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, siteId: string, id: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const report = await this.prisma.dailyProgressReport.findFirst({
      where: { id, tenantId, siteId },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        photos: {
          include: {
            location: { select: { id: true, name: true } },
            uploadedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { takenAt: 'desc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(this.i18n.translate('sites.errors.dprNotFound', {}, locale));
    }

    return report;
  }

  async create(tenantId: string, siteId: string, userId: string, dto: CreateDprDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const reportDate = new Date(dto.reportDate);

    const existing = await this.prisma.dailyProgressReport.findUnique({
      where: { tenantId_siteId_reportDate: { tenantId, siteId, reportDate } },
    });

    if (existing) {
      throw new ConflictException(this.i18n.translate('sites.errors.dprAlreadyExists', {}, locale));
    }

    const report = await this.prisma.dailyProgressReport.create({
      data: {
        tenantId,
        siteId,
        reportDate,
        title: dto.title,
        narrative: dto.narrative,
        weather: dto.weather,
        temperature: dto.temperature,
        workersOnSite: dto.workersOnSite || 0,
        equipmentOnSite: dto.equipmentOnSite,
        workCompleted: dto.workCompleted,
        workPlanned: dto.workPlanned,
        issuesRisks: dto.issuesRisks,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        photos: { select: { id: true, fileUrl: true, caption: true } },
      },
    });

    await this.auditLog(tenantId, userId, 'DPR_CREATED', 'DPR', report.id, {
      reportDate: dto.reportDate,
      title: dto.title,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'DPR_CREATED',
      title: `New DPR: ${dto.title}`,
      message: `Daily progress report created for ${dto.reportDate}`,
      linkUrl: `/sites/${siteId}/dpr`,
    });

    return report;
  }

  async update(tenantId: string, siteId: string, id: string, userId: string, dto: UpdateDprDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const existing = await this.prisma.dailyProgressReport.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!existing) {
      throw new NotFoundException(this.i18n.translate('sites.errors.dprNotFound', {}, locale));
    }

    const report = await this.prisma.dailyProgressReport.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.narrative && { narrative: dto.narrative }),
        ...(dto.weather !== undefined && { weather: dto.weather }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.workersOnSite !== undefined && { workersOnSite: dto.workersOnSite }),
        ...(dto.equipmentOnSite !== undefined && { equipmentOnSite: dto.equipmentOnSite }),
        ...(dto.workCompleted && { workCompleted: dto.workCompleted }),
        ...(dto.workPlanned && { workPlanned: dto.workPlanned }),
        ...(dto.issuesRisks !== undefined && { issuesRisks: dto.issuesRisks }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        photos: { select: { id: true, fileUrl: true, caption: true } },
      },
    });

    await this.auditLog(tenantId, userId, 'DPR_UPDATED', 'DPR', id, dto);

    return report;
  }

  async remove(tenantId: string, siteId: string, id: string, userId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const existing = await this.prisma.dailyProgressReport.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!existing) {
      throw new NotFoundException(this.i18n.translate('sites.errors.dprNotFound', {}, locale));
    }

    await this.prisma.dailyProgressReport.delete({ where: { id } });

    await this.auditLog(tenantId, userId, 'DPR_DELETED', 'DPR', id, {
      reportDate: existing.reportDate,
      title: existing.title,
    });

    return { success: true };
  }

  private async verifySiteAccess(tenantId: string, siteId: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });
    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }
    return site;
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

  private async notifySiteMembers(
    tenantId: string,
    siteId: string,
    excludeUserId: string,
    dto: { type: string; title: string; message: string; linkUrl?: string },
  ) {
    try {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId },
        select: { siteManagerId: true, projectId: true },
      });
      if (!site) return;

      const userIds: string[] = [];
      if (site.siteManagerId && site.siteManagerId !== excludeUserId) {
        userIds.push(site.siteManagerId);
      }

      const project = await this.prisma.project.findFirst({
        where: { id: site.projectId },
        select: { projectManagerId: true },
      });
      if (project?.projectManagerId && project.projectManagerId !== excludeUserId) {
        userIds.push(project.projectManagerId);
      }

      if (userIds.length > 0) {
        await this.notificationsService.createMany(tenantId, userIds, dto);
      }
    } catch (e) {
      this.logger.warn(`Failed to create notifications: ${e.message}`);
    }
  }
}

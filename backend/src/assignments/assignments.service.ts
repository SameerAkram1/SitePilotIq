import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateAssignmentDto, UpdateAssignmentDto, QueryAssignmentsDto, ReassignDto } from './dto';
import { AssignmentStatus } from '@prisma/client';
import { getTodayUtc, parseDateAsUtc, toUtcMidnight, INFINITY_DATE } from '../common/utils/date-utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Build a Prisma WHERE clause that matches assignments overlapping a given date range.
   * Null endDate is treated as ongoing (infinity).
   */
  private overlapWhere(tenantId: string, startDate: Date, endDate: Date | null, extra: any = {}) {
    return {
      tenantId,
      isDeleted: false,
      status: AssignmentStatus.ACTIVE,
      startDate: { lte: endDate ?? INFINITY_DATE },
      OR: [
        { endDate: null },
        { endDate: { gte: startDate } },
      ],
      ...extra,
    };
  }

  private paginate(query: QueryAssignmentsDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  private buildSortQuery(query: QueryAssignmentsDto) {
    if (query.sortBy) {
      return { [query.sortBy]: query.sortOrder || 'desc' };
    }
    return { startDate: 'desc' as const };
  }

  async checkOverlap(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date | null,
    excludeAssignmentId?: string,
  ) {
    const where = this.overlapWhere(tenantId, startDate, endDate, { userId });
    if (excludeAssignmentId) {
      where.id = { not: excludeAssignmentId };
    }

    return this.prisma.workerAssignment.findFirst({
      where,
      include: { site: { select: { id: true, name: true } } },
    });
  }

  async createAssignment(tenantId: string, dto: CreateAssignmentDto, assignedById: string, locale: string) {
    const userIds = dto.userIds?.length ? dto.userIds : dto.userId ? [dto.userId] : [];
    if (userIds.length === 0) {
      throw new BadRequestException(this.i18n.translate('assignments.errors.userIdRequired', {}, locale));
    }

    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, tenantId, isDeleted: false, status: 'ACTIVE' },
      include: { project: { select: { status: true } } },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.siteNotFound', {}, locale));
    }

    if (!site.project || site.project.status !== 'ACTIVE') {
      throw new BadRequestException(this.i18n.translate('assignments.errors.projectNotActive', {}, locale));
    }

    const startDate = parseDateAsUtc(dto.startDate);
    const endDate = dto.endDate ? parseDateAsUtc(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException(this.i18n.translate('assignments.errors.endDateBeforeStart', {}, locale));
    }

    const results: any[] = [];
    const errors: { userId: string; reason: string }[] = [];

    for (const userId of userIds) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId, status: 'ACTIVE' },
      });

      if (!user) {
        errors.push({ userId, reason: this.i18n.translate('assignments.errors.userNotFound', {}, locale) });
        continue;
      }

      try {
        const assignment = await this.prisma.$transaction(async (tx) => {
          const overlapWhere = this.overlapWhere(tenantId, startDate, endDate, { userId });
          const overlap = await tx.workerAssignment.findFirst({
            where: overlapWhere,
            include: { site: { select: { name: true } } },
          });

          if (overlap) {
            const rangeStr = overlap.endDate
              ? `${overlap.startDate.toISOString().split('T')[0]} to ${overlap.endDate.toISOString().split('T')[0]}`
              : `${overlap.startDate.toISOString().split('T')[0]} to ongoing`;
            throw new ConflictException(
              this.i18n.translate('assignments.errors.overlapConflict', { siteName: overlap.site.name, range: rangeStr }, locale),
            );
          }

          return tx.workerAssignment.create({
            data: {
              tenantId,
              siteId: dto.siteId,
              userId,
              trade: dto.trade,
              startDate,
              endDate,
              notes: dto.notes,
              assignedById,
            },
            include: {
              site: { select: { id: true, name: true, code: true } },
              user: { select: { id: true, fullName: true, role: true } },
            },
          });
        });

        results.push(assignment);

        await this.auditLog(tenantId, assignedById, 'SITE_ASSIGNMENT_CREATED', 'ASSIGNMENTS', assignment.id, {
          userId,
          siteId: dto.siteId,
          startDate: dto.startDate,
          endDate: dto.endDate,
        });

        this.notificationsService.create(tenantId, {
          userId,
          type: 'ASSIGNMENT',
          title: this.i18n.translate('assignments.notifications.assignedTitle', { siteName: assignment.site.name }, locale),
          message: this.i18n.translate('assignments.notifications.assignedMessage', { siteName: assignment.site.name, startDate: dto.startDate }, locale),
          linkUrl: `/sites/${dto.siteId}`,
        }).catch((e) => this.logger.warn(`Failed to create notification: ${e.message}`));
      } catch (err: any) {
        errors.push({ userId, reason: err.message ?? String(err) });
      }
    }

    return { created: results, errors };
  }

  async getAssignmentsForSite(tenantId: string, siteId: string, query: QueryAssignmentsDto, locale: string) {
    const { page, limit, skip } = this.paginate(query);
    const where: any = {
      tenantId,
      siteId,
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { trade: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      const queryStart = query.startDate ? parseDateAsUtc(query.startDate) : null;
      const queryEnd = query.endDate ? parseDateAsUtc(query.endDate) : null;
      const dateConditions: any[] = [];
      if (queryStart) {
        dateConditions.push({
          OR: [
            { endDate: null },
            { endDate: { gte: queryStart } },
          ],
        });
      }
      if (queryEnd) {
        dateConditions.push({ startDate: { lte: queryEnd } });
      }
      if (dateConditions.length > 0) {
        where.AND = dateConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.workerAssignment.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, role: true, email: true, phone: true } },
          assignedBy: { select: { id: true, fullName: true } },
          endedBy: { select: { id: true, fullName: true } },
        },
        orderBy: this.buildSortQuery(query),
        skip,
        take: limit,
      }),
      this.prisma.workerAssignment.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAssignmentsForUser(tenantId: string, userId: string, query: QueryAssignmentsDto, locale: string) {
    const { page, limit, skip } = this.paginate(query);
    const where: any = {
      tenantId,
      userId,
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const queryStart = query.startDate ? parseDateAsUtc(query.startDate) : null;
      const queryEnd = query.endDate ? parseDateAsUtc(query.endDate) : null;
      const dateConditions: any[] = [];
      if (queryStart) {
        dateConditions.push({
          OR: [
            { endDate: null },
            { endDate: { gte: queryStart } },
          ],
        });
      }
      if (queryEnd) {
        dateConditions.push({ startDate: { lte: queryEnd } });
      }
      if (dateConditions.length > 0) {
        where.AND = dateConditions;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.workerAssignment.findMany({
        where,
        include: {
          site: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, fullName: true } },
        },
        orderBy: this.buildSortQuery(query),
        skip,
        take: limit,
      }),
      this.prisma.workerAssignment.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getActiveAssignmentForUserToday(tenantId: string, userId: string) {
    const today = getTodayUtc();

    return this.prisma.workerAssignment.findFirst({
      where: this.overlapWhere(tenantId, today, today, { userId }),
      include: {
        site: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async getStats(tenantId: string, locale: string) {
    const today = getTodayUtc();

    const [totalWorkers, activeSites, activeAssignments] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, status: 'ACTIVE', onboardingComplete: true },
      }),
      this.prisma.site.count({
        where: { tenantId, status: 'ACTIVE', isDeleted: false },
      }),
      this.prisma.workerAssignment.count({
        where: this.overlapWhere(tenantId, today, today),
      }),
    ]);

    return { totalWorkers, activeSites, activeAssignments };
  }

  async getSitesWithAssignments(tenantId: string, locale: string) {
    const sites = await this.prisma.site.findMany({
      where: { tenantId, isDeleted: false, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const today = getTodayUtc();

    const assignmentCounts = await this.prisma.workerAssignment.groupBy({
      by: ['siteId'],
      where: this.overlapWhere(tenantId, today, today),
      _count: { id: true },
    });

    const countMap = new Map(assignmentCounts.map((a) => [a.siteId, a._count.id]));

    return sites.map((site) => ({
      ...site,
      assignedCount: countMap.get(site.id) || 0,
    }));
  }

  async getAvailableWorkers(tenantId: string, locale: string, excludeSiteId?: string, query?: QueryAssignmentsDto) {
    const { page, limit, skip } = this.paginate(query || {});
    const today = getTodayUtc();

    const overlapWhere = this.overlapWhere(tenantId, today, today);
    if (excludeSiteId) {
      overlapWhere.siteId = { not: excludeSiteId };
    }

    const assignedUserIds = await this.prisma.workerAssignment.findMany({
      where: overlapWhere,
      select: { userId: true },
    });

    const assignedIds = assignedUserIds.map((a) => a.userId);

    const where: any = {
      tenantId,
      status: 'ACTIVE',
      onboardingComplete: true,
      id: { notIn: assignedIds },
    };

    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true,
          phone: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateAssignment(tenantId: string, id: string, dto: UpdateAssignmentDto, requestingUserId: string, locale: string) {
    const assignment = await this.prisma.workerAssignment.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!assignment) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.notFound', {}, locale));
    }

    const updateData: any = {};

    if (dto.endDate !== undefined) {
      const newEndDate = dto.endDate ? parseDateAsUtc(dto.endDate) : null;
      if (newEndDate && newEndDate <= assignment.startDate) {
        throw new BadRequestException(this.i18n.translate('assignments.errors.endDateBeforeStart', {}, locale));
      }

      const overlap = await this.checkOverlap(
        tenantId,
        assignment.userId,
        assignment.startDate,
        newEndDate,
        id,
      );

      if (overlap) {
        const rangeStr = overlap.endDate
          ? `${overlap.startDate.toISOString().split('T')[0]} to ${overlap.endDate.toISOString().split('T')[0]}`
          : `${overlap.startDate.toISOString().split('T')[0]} to ongoing`;
        throw new ConflictException(
          this.i18n.translate('assignments.errors.overlapConflict', { siteName: overlap.site.name, range: rangeStr }, locale),
        );
      }

      updateData.endDate = newEndDate;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    if (dto.trade !== undefined) {
      updateData.trade = dto.trade;
    }

    const oldValues = {
      endDate: assignment.endDate?.toISOString() ?? null,
      trade: assignment.trade ?? null,
      notes: assignment.notes ?? null,
    };

    const updated = await this.prisma.workerAssignment.update({
      where: { id },
      data: updateData,
      include: {
        site: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.auditLog(tenantId, requestingUserId, 'SITE_ASSIGNMENT_UPDATED', 'ASSIGNMENTS', id, { oldValues, newValues: updateData });

    const siteName = updated.site?.name ?? '';
    this.notificationsService.create(tenantId, {
      userId: assignment.userId,
      type: 'ASSIGNMENT',
      title: this.i18n.translate('assignments.notifications.updatedTitle', {}, locale),
      message: this.i18n.translate('assignments.notifications.updatedMessage', { siteName }, locale),
      linkUrl: `/assignments`,
    }).catch(() => {});

    return updated;
  }

  async endAssignment(tenantId: string, id: string, requestingUserId: string, locale: string) {
    const assignment = await this.prisma.workerAssignment.findFirst({
      where: { id, tenantId, isDeleted: false, status: AssignmentStatus.ACTIVE },
    });

    if (!assignment) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.notFound', {}, locale));
    }

    const today = getTodayUtc();

    const updated = await this.prisma.workerAssignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.ENDED,
        endDate: today,
        endedById: requestingUserId,
        endedAt: new Date(),
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.auditLog(tenantId, requestingUserId, 'SITE_ASSIGNMENT_ENDED', 'ASSIGNMENTS', id, {
      userId: assignment.userId,
      siteId: assignment.siteId,
    });

    const siteName = updated.site?.name ?? '';
    this.notificationsService.create(tenantId, {
      userId: assignment.userId,
      type: 'ASSIGNMENT',
      title: this.i18n.translate('assignments.notifications.endedTitle', {}, locale),
      message: this.i18n.translate('assignments.notifications.endedMessage', { siteName }, locale),
      linkUrl: `/assignments`,
    }).catch(() => {});

    return updated;
  }

  async cancelAssignment(tenantId: string, id: string, requestingUserId: string, locale: string) {
    const assignment = await this.prisma.workerAssignment.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!assignment) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.notFound', {}, locale));
    }

    const updated = await this.prisma.workerAssignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.CANCELLED,
        isDeleted: true,
        endedById: requestingUserId,
        endedAt: new Date(),
      },
    });

    await this.auditLog(tenantId, requestingUserId, 'SITE_ASSIGNMENT_CANCELLED', 'ASSIGNMENTS', id, {
      userId: assignment.userId,
      siteId: assignment.siteId,
    });

    const siteName = assignment.siteId ? (await this.prisma.site.findFirst({ where: { id: assignment.siteId }, select: { name: true } }))?.name ?? '' : '';
    this.notificationsService.create(tenantId, {
      userId: assignment.userId,
      type: 'ASSIGNMENT',
      title: this.i18n.translate('assignments.notifications.cancelledTitle', {}, locale),
      message: this.i18n.translate('assignments.notifications.cancelledMessage', { siteName }, locale),
      linkUrl: `/assignments`,
    }).catch(() => {});

    return { success: true };
  }

  async reassignUser(tenantId: string, dto: ReassignDto, requestingUserId: string, locale: string) {
    const newSite = await this.prisma.site.findFirst({
      where: { id: dto.newSiteId, tenantId, isDeleted: false, status: 'ACTIVE' },
      include: { project: { select: { status: true } } },
    });

    if (!newSite) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.siteNotFound', {}, locale));
    }

    if (!newSite.project || newSite.project.status !== 'ACTIVE') {
      throw new BadRequestException(this.i18n.translate('assignments.errors.projectNotActive', {}, locale));
    }

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId, status: 'ACTIVE' },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.userNotFound', {}, locale));
    }

    const newStartDate = parseDateAsUtc(dto.startDate);
    const newEndDate = dto.endDate ? parseDateAsUtc(dto.endDate) : null;

    if (newEndDate && newEndDate <= newStartDate) {
      throw new BadRequestException(this.i18n.translate('assignments.errors.endDateBeforeStart', {}, locale));
    }

    const today = getTodayUtc();

    const result = await this.prisma.$transaction(async (tx) => {
      // Overlap check INSIDE transaction to prevent race conditions
      const overlapWhere = this.overlapWhere(tenantId, newStartDate, newEndDate, { userId: dto.userId });
      const overlap = await tx.workerAssignment.findFirst({
        where: overlapWhere,
        include: { site: { select: { name: true } } },
      });

      if (overlap) {
        const rangeStr = overlap.endDate
          ? `${overlap.startDate.toISOString().split('T')[0]} to ${overlap.endDate.toISOString().split('T')[0]}`
          : `${overlap.startDate.toISOString().split('T')[0]} to ongoing`;
        throw new ConflictException(
          this.i18n.translate('assignments.errors.overlapConflict', { siteName: overlap.site.name, range: rangeStr }, locale),
        );
      }

      const currentAssignment = await tx.workerAssignment.findFirst({
        where: this.overlapWhere(tenantId, today, today, { userId: dto.userId }),
      });
      if (currentAssignment) {
        const dayBefore = toUtcMidnight(new Date(newStartDate.getTime() - 86400000));
        const endDateForOld = dayBefore < currentAssignment.startDate ? currentAssignment.startDate : dayBefore;

        await tx.workerAssignment.update({
          where: { id: currentAssignment.id },
          data: {
            status: AssignmentStatus.ENDED,
            endDate: endDateForOld,
            endedById: requestingUserId,
            endedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: requestingUserId,
            action: 'SITE_ASSIGNMENT_ENDED',
            module: 'ASSIGNMENTS',
            recordId: currentAssignment.id,
            newValues: { reason: 'reassigned' },
          },
        });
      }

      const newAssignment = await tx.workerAssignment.create({
        data: {
          tenantId,
          siteId: dto.newSiteId,
          userId: dto.userId,
          startDate: newStartDate,
          endDate: newEndDate,
          notes: dto.notes,
          assignedById: requestingUserId,
        },
        include: {
          site: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, fullName: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: requestingUserId,
          action: 'SITE_ASSIGNMENT_CREATED',
          module: 'ASSIGNMENTS',
          recordId: newAssignment.id,
          newValues: {
            userId: dto.userId,
            siteId: dto.newSiteId,
            startDate: dto.startDate,
            endDate: dto.endDate,
          },
        },
      });

      return { endedOldAssignmentId: currentAssignment?.id, newAssignment };
    });

    const newSiteName = result.newAssignment.site?.name ?? '';
    this.notificationsService.create(tenantId, {
      userId: dto.userId,
      type: 'ASSIGNMENT',
      title: this.i18n.translate('assignments.notifications.reassignedTitle', {}, locale),
      message: this.i18n.translate('assignments.notifications.reassignedMessage', { siteName: newSiteName }, locale),
      linkUrl: `/assignments`,
    }).catch(() => {});

    return result;
  }

  async getWorkerAssignmentHistory(tenantId: string, userId: string, query: QueryAssignmentsDto, locale: string) {
    const { page, limit, skip } = this.paginate(query);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, fullName: true, email: true, role: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('assignments.errors.userNotFound', {}, locale));
    }

    const where = { tenantId, userId, isDeleted: false };
    const [assignments, total] = await Promise.all([
      this.prisma.workerAssignment.findMany({
        where,
        include: {
          site: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, fullName: true } },
          endedBy: { select: { id: true, fullName: true } },
        },
        orderBy: this.buildSortQuery(query),
        skip,
        take: limit,
      }),
      this.prisma.workerAssignment.count({ where }),
    ]);

    return { user, assignments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getTradeBreakdown(tenantId: string, siteId: string, locale?: string) {
    const today = getTodayUtc();

    const assignments = await this.prisma.workerAssignment.findMany({
      where: this.overlapWhere(tenantId, today, today, { siteId }),
      select: { trade: true },
    });

    const unassignedLabel = this.i18n.translate('common.unassigned', {}, locale || 'en');
    const breakdown: Record<string, number> = {};
    for (const a of assignments) {
      const trade = a.trade || unassignedLabel;
      breakdown[trade] = (breakdown[trade] || 0) + 1;
    }

    return { total: assignments.length, breakdown };
  }

  async checkOverlapWarning(tenantId: string, userId: string, startDate: string, endDate?: string) {
    const start = parseDateAsUtc(startDate);
    const end = endDate ? parseDateAsUtc(endDate) : null;

    const overlap = await this.checkOverlap(tenantId, userId, start, end);

    if (overlap) {
      return {
        hasOverlap: true,
        conflictingSite: overlap.site.name,
        conflictingSiteId: overlap.siteId,
        existingStart: overlap.startDate.toISOString().split('T')[0],
        existingEnd: overlap.endDate ? overlap.endDate.toISOString().split('T')[0] : null,
      };
    }

    return { hasOverlap: false };
  }

  async exportSiteAssignments(tenantId: string, siteId: string, query: QueryAssignmentsDto) {
    const where: any = {
      tenantId,
      siteId,
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const queryStart = query.startDate ? parseDateAsUtc(query.startDate) : null;
      const queryEnd = query.endDate ? parseDateAsUtc(query.endDate) : null;
      const dateConditions: any[] = [];
      if (queryStart) {
        dateConditions.push({
          OR: [
            { endDate: null },
            { endDate: { gte: queryStart } },
          ],
        });
      }
      if (queryEnd) {
        dateConditions.push({ startDate: { lte: queryEnd } });
      }
      if (dateConditions.length > 0) {
        where.AND = dateConditions;
      }
    }

    const assignments = await this.prisma.workerAssignment.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        site: { select: { name: true, code: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const headers = ['Worker Name', 'Email', 'Role', 'Trade', 'Site', 'Start Date', 'End Date', 'Status', 'Notes'];
    const rows = assignments.map((a) => [
      a.user.fullName,
      a.user.email,
      a.user.role,
      a.trade || '',
      a.site.name,
      a.startDate.toISOString().split('T')[0],
      a.endDate ? a.endDate.toISOString().split('T')[0] : 'Ongoing',
      a.status,
      a.notes || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return csv;
  }

  private async auditLog(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    recordId: string,
    newValues?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          module,
          recordId,
          newValues,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }
  }
}

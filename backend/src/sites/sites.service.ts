import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrCodeService } from './qr-code.service';
import { I18nService } from '../i18n/i18n.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  QuerySitesDto,
} from './dto/site.dto';
import { generateSiteCode } from '../common/utils/code-generator.util';
import { UserRole, SiteStatus, ProjectStatus } from '@prisma/client';

const SITE_STATUS_TRANSITIONS: Record<SiteStatus, SiteStatus[]> = {
  DRAFT: ['ACTIVE', 'DISABLED'],
  ACTIVE: ['COMPLETED', 'DISABLED'],
  COMPLETED: ['DISABLED'],
  DISABLED: [],
};

@Injectable()
export class SitesService {
  private readonly logger = new Logger(SitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrCodeService: QrCodeService,
    private readonly i18n: I18nService,
  ) {}

  async create(tenantId: string, dto: CreateSiteDto, createdById: string, locale: string) {
    // Verify project exists, belongs to tenant, is not deleted
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(this.i18n.translate('sites.errors.projectNotFound', {}, locale));
    }

    // Cannot create site under CANCELLED or COMPLETED project
    if (project.status === ProjectStatus.CANCELLED || project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        this.i18n.translate('sites.errors.cannotCreateUnderStatus', { status: project.status.toLowerCase() }, locale),
      );
    }

    // Validate siteManagerId belongs to tenant
    const sm = await this.prisma.user.findFirst({
      where: {
        id: dto.siteManagerId,
        tenantId,
        role: { in: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER] },
      },
    });

    if (!sm) {
      throw new BadRequestException(
        this.i18n.translate('sites.errors.siteManagerInvalid', {}, locale),
      );
    }

    const code = await generateSiteCode(this.prisma, tenantId, project.code);

    const site = await this.prisma.site.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        name: dto.name,
        code,
        locationAddress: dto.locationAddress || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        locationRadius: dto.locationRadius ?? 100,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        siteManagerId: dto.siteManagerId,
        notes: dto.notes || null,
        status: SiteStatus.DRAFT,
        createdById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        siteManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
      },
    });

    // Generate QR code immediately
    const qrCodeImageUrl = await this.qrCodeService.generateQrCodeImage({
      id: site.id,
      tenantId,
      qrCodeToken: site.qrCodeToken,
    });

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: createdById,
          action: 'SITE_CREATED',
          module: 'SITES',
          recordId: site.id,
          newValues: { name: dto.name, code, projectId: dto.projectId },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { ...site, qrCodeImageUrl };
  }

  async findAll(tenantId: string, filters: QuerySitesDto) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    if (filters.siteManagerId) where.siteManagerId = filters.siteManagerId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const allowedSortBy = ['createdAt', 'name', 'code', 'status', 'plannedEndDate'];
    const sortBy = allowedSortBy.includes(filters.sortBy || '') ? filters.sortBy! : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.site.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            project: { select: { id: true, name: true, code: true } },
            siteManager: {
              select: { id: true, fullName: true, email: true, profilePhoto: true },
            },
          },
        }),
        this.prisma.site.count({ where }),
      ]),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(tenantId: string, id: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        project: { select: { id: true, name: true, code: true, status: true } },
        siteManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        locations: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    return site;
  }

  async getDashboard(tenantId: string, id: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    const [
      workersCount,
      boqCount,
      ipcCount,
      boqTotalResult,
      ipcCertifiedResult,
      expensesResult,
    ] = await Promise.all([
      // Active worker assignments for this site
      this.prisma.workerAssignment.count({
        where: { tenantId, siteId: id, isDeleted: false, status: 'ACTIVE' },
      }),
      // Total BoQ items for this site
      this.prisma.boQItem.count({
        where: { tenantId, siteId: id },
      }),
      // Total IPC records for this site
      this.prisma.ipcRecord.count({
        where: { tenantId, siteId: id },
      }),
      // Sum of baseline BoQ total amounts (contract value)
      this.prisma.boQItem.aggregate({
        where: { tenantId, siteId: id, isBaseline: true },
        _sum: { totalAmount: true },
      }),
      // Sum of certified IPC gross amounts (work completed)
      this.prisma.ipcRecord.aggregate({
        where: { tenantId, siteId: id, status: 'CERTIFIED' },
        _sum: { certifiedGross: true },
      }),
      // Sum of all payment records for this site
      this.prisma.ipcPaymentRecord.aggregate({
        where: { ipcRecord: { tenantId, siteId: id } },
        _sum: { amount: true },
      }),
    ]);

    // Calculate completion progress: certified amounts / contract value
    const contractValue = Number(boqTotalResult._sum.totalAmount || 0);
    const certifiedAmount = Number(ipcCertifiedResult._sum.certifiedGross || 0);
    const completionProgress = contractValue > 0
      ? Math.min(100, Math.round((certifiedAmount / contractValue) * 100 * 100) / 100)
      : null;

    return {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.code,
      workersCount,
      boqCount,
      ipcCount,
      completionProgress,
      expensesTotal: Number(expensesResult._sum.amount || 0),
      inventoryItemsCount: 0, // No inventory module yet
    };
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSiteDto,
    requestingUser: { id: string; role: UserRole },
    locale: string,
  ) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    // Only ADMIN or assigned SITE_MANAGER can edit
    if (
      requestingUser.role !== UserRole.ADMIN &&
      !(requestingUser.role === UserRole.SITE_MANAGER && site.siteManagerId === requestingUser.id)
    ) {
      throw new ForbiddenException(
        this.i18n.translate('sites.errors.onlyAdminOrManagerCanEdit', {}, locale),
      );
    }

    // Validate status transition
    if (dto.status && dto.status !== site.status) {
      const allowedTransitions = SITE_STATUS_TRANSITIONS[site.status];
      if (!allowedTransitions.includes(dto.status)) {
        throw new BadRequestException(
          this.i18n.translate('sites.errors.invalidStatusTransition', {
            from: site.status,
            to: dto.status,
            allowed: allowedTransitions.join(', ') || 'none',
          }, locale),
        );
      }
    }

    // Handle project reassignment (ADMIN only with confirmation)
    if (dto.projectId && dto.projectId !== site.projectId) {
      if (requestingUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          this.i18n.translate('sites.errors.onlyAdminCanReassign', {}, locale),
        );
      }

      if (!dto.confirmProjectReassignment) {
        throw new BadRequestException(
          this.i18n.translate('sites.errors.confirmReassignment', {}, locale),
        );
      }

      // Verify new project exists and belongs to tenant
      const newProject = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, isDeleted: false },
      });

      if (!newProject) {
        throw new BadRequestException(this.i18n.translate('sites.errors.targetProjectNotFound', {}, locale));
      }
    }

    const oldValues = {
      name: site.name,
      status: site.status,
      projectId: site.projectId,
    };

    const updated = await this.prisma.site.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.locationAddress !== undefined && { locationAddress: dto.locationAddress }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.locationRadius !== undefined && { locationRadius: dto.locationRadius }),
        ...(dto.plannedEndDate !== undefined && {
          plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        }),
        ...(dto.actualEndDate !== undefined && {
          actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null,
        }),
        ...(dto.siteManagerId && { siteManagerId: dto.siteManagerId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
        ...(dto.projectId && { projectId: dto.projectId }),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        siteManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
      },
    });

    // Audit log
    const auditAction = dto.projectId && dto.projectId !== site.projectId
      ? 'SITE_REASSIGNED_PROJECT'
      : 'SITE_UPDATED';

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: requestingUser.id,
          action: auditAction,
          module: 'SITES',
          recordId: id,
          oldValues,
          newValues: dto as any,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return updated;
  }

  async disable(tenantId: string, id: string, requestingUser: { id: string; role: UserRole }, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    // ADMIN or assigned SITE_MANAGER
    if (
      requestingUser.role !== UserRole.ADMIN &&
      !(requestingUser.role === UserRole.SITE_MANAGER && site.siteManagerId === requestingUser.id)
    ) {
      throw new ForbiddenException(
        this.i18n.translate('sites.errors.onlyAdminOrManagerCanDisable', {}, locale),
      );
    }

    const [activeWorkers, pendingIpcs] = await Promise.all([
      this.prisma.workerAssignment.count({
        where: { siteId: id, status: 'ACTIVE', isDeleted: false },
      }),
      this.prisma.ipcRecord.count({
        where: { siteId: id, status: { in: ['DRAFT', 'SUBMITTED'] } },
      }),
    ]);

    if (activeWorkers > 0) {
      throw new BadRequestException(
        this.i18n.translate('sites.errors.hasActiveWorkers', {}, locale),
      );
    }

    if (pendingIpcs > 0) {
      throw new BadRequestException(
        this.i18n.translate('sites.errors.hasPendingIpcs', {}, locale),
      );
    }

    await this.prisma.site.update({
      where: { id },
      data: { isDeleted: true },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: requestingUser.id,
          action: 'SITE_DISABLED',
          module: 'SITES',
          recordId: id,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { message: this.i18n.translate('sites.errors.disabledSuccess', {}, locale) };
  }

  async getQrCodeImage(tenantId: string, id: string, locale: string): Promise<string> {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
      select: { id: true, tenantId: true, qrCodeToken: true },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    return this.qrCodeService.generateQrCodeImage({
      id: site.id,
      tenantId: site.tenantId,
      qrCodeToken: site.qrCodeToken,
    });
  }

  async regenerateQr(tenantId: string, id: string, userId: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    return this.qrCodeService.regenerateQrCode(tenantId, id, userId);
  }
}

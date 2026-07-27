import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  QueryProjectsDto,
} from './dto/project.dto';
import { generateProjectCode } from '../common/utils/code-generator.util';
import { UserRole, ProjectStatus } from '@prisma/client';

const PROJECT_DOCUMENTS_BUCKET = 'project-documents';
const PROJECT_ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const PROJECT_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly uploadService: UploadService,
  ) {}

  async create(tenantId: string, dto: CreateProjectDto, createdById: string, locale: string) {
    // Validate projectManagerId belongs to tenant with appropriate role
    const pm = await this.prisma.user.findFirst({
      where: {
        id: dto.projectManagerId,
        tenantId,
        role: { in: [UserRole.ADMIN, UserRole.PROJECT_MANAGER] },
      },
    });

    if (!pm) {
      throw new BadRequestException(
        this.i18n.translate('projects.errors.managerInvalid', {}, locale),
      );
    }

    // Validate categoryId belongs to tenant if provided
    if (dto.categoryId) {
      const category = await this.prisma.projectCategory.findFirst({
        where: { id: dto.categoryId, tenantId, isActive: true },
      });
      if (!category) {
        throw new BadRequestException(
          this.i18n.translate('projects.errors.categoryNotFound', {}, locale),
        );
      }
    }

    // Validate clientId is a valid Client if provided
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId, isDeleted: false },
      });
      if (!client) {
        throw new BadRequestException(
          this.i18n.translate('projects.errors.clientNotFound', {}, locale),
        );
      }
    }

    const code = await generateProjectCode(this.prisma, tenantId);

    const project = await this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        code,
        startDate: new Date(dto.startDate),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        categoryId: dto.categoryId || null,
        clientId: dto.clientId || null,
        summary: dto.summary || null,
        projectManagerId: dto.projectManagerId,
        status: ProjectStatus.DRAFT,
        createdById,
      },
      include: {
        category: true,
        client: {
          select: { id: true, code: true, name: true },
        },
        projectManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
      },
    });

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: createdById,
          action: 'PROJECT_CREATED',
          module: 'PROJECTS',
          recordId: project.id,
          newValues: { name: dto.name, code },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return project;
  }

  async findAll(tenantId: string, filters: QueryProjectsDto) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status) {
      const statuses = filters.status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.projectManagerId)
      where.projectManagerId = filters.projectManagerId;
    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) where.startDate.gte = new Date(filters.startDateFrom);
      if (filters.startDateTo) where.startDate.lte = new Date(filters.startDateTo);
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const allowedSortBy = ['createdAt', 'name', 'code', 'status', 'startDate', 'deadline'];
    const sortBy = allowedSortBy.includes(filters.sortBy || '') ? filters.sortBy! : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: true,
            client: {
              select: { id: true, code: true, name: true },
            },
            projectManager: {
              select: { id: true, fullName: true, email: true, profilePhoto: true },
            },
            _count: { select: { sites: { where: { isDeleted: false } } } },
          },
        }),
        this.prisma.project.count({ where }),
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
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        category: true,
        client: {
          select: { id: true, code: true, name: true },
        },
        projectManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        sites: {
          where: { isDeleted: false },
          select: { id: true, name: true, code: true, status: true },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.notFound', {}, locale),
      );
    }

    return project;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProjectDto,
    requestingUser: { id: string; role: UserRole },
    locale: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.notFound', {}, locale),
      );
    }

    // Only ADMIN or assigned PROJECT_MANAGER can edit
    if (
      requestingUser.role !== UserRole.ADMIN &&
      !(requestingUser.role === UserRole.PROJECT_MANAGER && project.projectManagerId === requestingUser.id)
    ) {
      throw new ForbiddenException(
        this.i18n.translate('projects.errors.onlyAdminOrManagerCanEdit', {}, locale),
      );
    }

    // Validate status transition
    if (dto.status && dto.status !== project.status) {
      const allowedTransitions = PROJECT_STATUS_TRANSITIONS[project.status];
      if (!allowedTransitions.includes(dto.status)) {
        throw new BadRequestException(
          this.i18n.translate('projects.errors.invalidStatusTransition', {
            from: project.status,
            to: dto.status,
            allowed: allowedTransitions.join(', ') || 'none',
          }, locale),
        );
      }
    }

    // If status changing to CANCELLED or COMPLETED, check no active sites
    if (dto.status === 'CANCELLED' || dto.status === 'COMPLETED') {
      const activeSites = await this.prisma.site.findMany({
        where: {
          tenantId,
          projectId: id,
          isDeleted: false,
          status: { in: ['ACTIVE', 'DRAFT'] },
        },
      });

      if (activeSites.length > 0) {
        throw new BadRequestException(
          this.i18n.translate('projects.errors.activeSitesExist', { status: dto.status, sites: activeSites.map((s) => s.name).join(', ') }, locale),
        );
      }
    }

    // If completing, check for uncertified or unpaid IPCs
    if (dto.status === 'COMPLETED') {
      const projectSites = await this.prisma.site.findMany({
        where: { tenantId, projectId: id, isDeleted: false },
        select: { id: true },
      });

      if (projectSites.length > 0) {
        const siteIds = projectSites.map((s) => s.id);

        const [uncertifiedCount, unpaidCount] = await Promise.all([
          this.prisma.ipcRecord.count({
            where: { siteId: { in: siteIds }, status: { in: ['DRAFT', 'SUBMITTED'] } },
          }),
          this.prisma.ipcRecord.count({
            where: { siteId: { in: siteIds }, status: 'CERTIFIED', paidAt: null },
          }),
        ]);

        if (uncertifiedCount > 0) {
          throw new BadRequestException(
            this.i18n.translate('projects.errors.uncertifiedIpcsExist', { count: uncertifiedCount }, locale),
          );
        }

        if (unpaidCount > 0) {
          throw new BadRequestException(
            this.i18n.translate('projects.errors.unpaidIpcsExist', { count: unpaidCount }, locale),
          );
        }
      }
    }

    // Validate clientId if being changed
    if (dto.clientId !== undefined && dto.clientId !== null) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId, isDeleted: false },
      });
      if (!client) {
        throw new BadRequestException(
          this.i18n.translate('projects.errors.clientNotFound', {}, locale),
        );
      }
    }

    const oldValues = {
      name: project.name,
      status: project.status,
      deadline: project.deadline,
    };

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.deadline !== undefined && {
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId || null }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.projectManagerId && { projectManagerId: dto.projectManagerId }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        category: true,
        client: {
          select: { id: true, code: true, name: true },
        },
        projectManager: {
          select: { id: true, fullName: true, email: true, profilePhoto: true },
        },
      },
    });

    // Audit log with diff
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: requestingUser.id,
          action: 'PROJECT_UPDATED',
          module: 'PROJECTS',
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

  async disable(tenantId: string, id: string, userId: string, locale: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { _count: { select: { sites: { where: { isDeleted: false, status: { in: ['ACTIVE', 'DRAFT'] } } } } } },
    });

    if (!project) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.notFound', {}, locale),
      );
    }

    if (project._count.sites > 0) {
      throw new BadRequestException(
        this.i18n.translate('projects.errors.cannotDisableWithSites', { name: project.name, count: project._count.sites }, locale),
      );
    }

    await this.prisma.project.update({
      where: { id },
      data: { isDeleted: true },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'PROJECT_DISABLED',
          module: 'PROJECTS',
          recordId: id,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { message: 'Project disabled successfully' };
  }

  async uploadAttachment(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
    uploadedById: string,
    locale: string,
    description?: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.notFound', {}, locale),
      );
    }

    // Upload file to Supabase Storage
    const filePath = await this.uploadService.uploadFile(
      tenantId,
      PROJECT_DOCUMENTS_BUCKET,
      `project-documents/${projectId}`,
      file,
      PROJECT_ATTACHMENT_MIME_TYPES,
      PROJECT_ATTACHMENT_MAX_SIZE,
      locale,
    );

    // Create attachment record with actual storage path
    const attachment = await this.prisma.projectAttachment.create({
      data: {
        tenantId,
        projectId,
        fileName: file.originalname,
        fileUrl: filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null,
        uploadedById,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: uploadedById,
          action: 'PROJECT_ATTACHMENT_UPLOADED',
          module: 'PROJECTS',
          recordId: projectId,
          newValues: { fileName: file.originalname, fileSize: file.size },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return attachment;
  }

  async deleteAttachment(
    tenantId: string,
    attachmentId: string,
    requestingUser: { id: string; role: UserRole },
    locale: string,
  ) {
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.attachmentNotFound', {}, locale),
      );
    }

    // Only ADMIN or original uploader can delete
    if (
      requestingUser.role !== UserRole.ADMIN &&
      attachment.uploadedById !== requestingUser.id
    ) {
      throw new ForbiddenException(
        this.i18n.translate('projects.errors.onlyAdminOrUploaderCanDelete', {}, locale),
      );
    }

    // Delete from Supabase Storage
    await this.uploadService.deleteFile(PROJECT_DOCUMENTS_BUCKET, attachment.fileUrl);

    // Delete DB record
    await this.prisma.projectAttachment.delete({
      where: { id: attachmentId },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: requestingUser.id,
          action: 'PROJECT_ATTACHMENT_DELETED',
          module: 'PROJECTS',
          recordId: attachment.projectId,
          oldValues: { fileName: attachment.fileName },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { message: 'Attachment deleted successfully' };
  }

  async updateAttachment(
    tenantId: string,
    attachmentId: string,
    data: { description?: string },
    locale: string,
  ) {
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.attachmentNotFound', {}, locale),
      );
    }

    return this.prisma.projectAttachment.update({
      where: { id: attachmentId },
      data: { description: data.description ?? null },
    });
  }

  async getAttachmentSignedUrl(
    tenantId: string,
    attachmentId: string,
    locale: string,
  ) {
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException(
        this.i18n.translate('projects.errors.attachmentNotFound', {}, locale),
      );
    }

    const signedUrl = await this.uploadService.getSignedUrl(
      PROJECT_DOCUMENTS_BUCKET,
      attachment.fileUrl,
    );

    return { signedUrl, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }
}

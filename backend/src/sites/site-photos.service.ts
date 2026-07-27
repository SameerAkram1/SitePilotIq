import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { I18nService } from '../i18n/i18n.service';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB
const PHOTO_BUCKET = 'site-photos';

@Injectable()
export class SitePhotosService {
  private readonly logger = new Logger(SitePhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: { page?: number; limit?: number; locationId?: string; startDate?: string; endDate?: string }, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, siteId };

    if (query.locationId) where.locationId = query.locationId;

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.takenAt = dateFilter;
    }

    const [photos, total] = await Promise.all([
      this.prisma.sitePhoto.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, fullName: true } },
          dpr: { select: { id: true, title: true, reportDate: true } },
        },
        orderBy: { takenAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sitePhoto.count({ where }),
    ]);

    const data = await Promise.all(
      photos.map(async (photo) => {
        const signedUrl = await this.resolveSignedUrl(photo.fileUrl);
        return { ...photo, fileUrl: signedUrl || photo.fileUrl };
      }),
    );

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async upload(tenantId: string, siteId: string, userId: string, file: Express.Multer.File, dto: { caption?: string; description?: string; locationId?: string; dprId?: string }, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const fileUrl = await this.uploadService.uploadFile(
      tenantId,
      'site-photos',
      siteId,
      file,
      ALLOWED_PHOTO_TYPES,
      MAX_PHOTO_SIZE,
      locale,
    );

    const photo = await this.prisma.sitePhoto.create({
      data: {
        tenantId,
        siteId,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        caption: dto.caption || null,
        description: dto.description || null,
        locationId: dto.locationId || null,
        dprId: dto.dprId || null,
        uploadedById: userId,
      },
      include: {
        location: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    const signedUrl = await this.resolveSignedUrl(photo.fileUrl);

    await this.auditLog(tenantId, userId, 'SITE_PHOTO_UPLOADED', 'SITE', siteId, {
      fileName: file.originalname,
      caption: dto.caption,
      description: dto.description,
    });

    return { ...photo, fileUrl: signedUrl || photo.fileUrl };
  }

  async update(tenantId: string, siteId: string, photoId: string, userId: string, dto: { caption?: string; description?: string; locationId?: string }, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const photo = await this.prisma.sitePhoto.findFirst({
      where: { id: photoId, tenantId, siteId },
    });

    if (!photo) {
      throw new NotFoundException(this.i18n.translate('sites.errors.photoNotFound', {}, locale));
    }

    const updated = await this.prisma.sitePhoto.update({
      where: { id: photoId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId || null }),
      },
      include: {
        location: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, fullName: true } },
        dpr: { select: { id: true, title: true, reportDate: true } },
      },
    });

    await this.auditLog(tenantId, userId, 'SITE_PHOTO_UPDATED', 'SITE', siteId, {
      photoId,
      caption: dto.caption,
      description: dto.description,
    });

    return updated;
  }

  async remove(tenantId: string, siteId: string, photoId: string, userId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const photo = await this.prisma.sitePhoto.findFirst({
      where: { id: photoId, tenantId, siteId },
    });

    if (!photo) {
      throw new NotFoundException(this.i18n.translate('sites.errors.photoNotFound', {}, locale));
    }

    try {
      await this.uploadService.deleteFile(PHOTO_BUCKET, photo.fileUrl);
    } catch (e) {
      this.logger.warn(`Failed to delete photo from storage: ${e.message}`);
    }

    await this.prisma.sitePhoto.delete({ where: { id: photoId } });

    await this.auditLog(tenantId, userId, 'SITE_PHOTO_DELETED', 'SITE', siteId, {
      fileName: photo.fileName,
    });

    return { success: true };
  }

  private async resolveSignedUrl(filePath: string): Promise<string | null> {
    if (!filePath) return null;
    try {
      return await this.uploadService.getSignedUrl(PHOTO_BUCKET, filePath, 3600);
    } catch {
      return null;
    }
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
}

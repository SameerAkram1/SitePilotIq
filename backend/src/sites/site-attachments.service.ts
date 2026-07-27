import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { I18nService } from '../i18n/i18n.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
];

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const DOCUMENT_BUCKET = 'site-documents';

@Injectable()
export class SiteAttachmentsService {
  private readonly logger = new Logger(SiteAttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string, siteId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const attachments = await this.prisma.siteAttachment.findMany({
      where: { tenantId, siteId },
      include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      attachments.map(async (att) => {
        const signedUrl = await this.resolveSignedUrl(att.fileUrl);
        return { ...att, fileUrl: signedUrl || att.fileUrl };
      }),
    );
  }

  async getDownloadUrl(tenantId: string, siteId: string, attachmentId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const attachment = await this.prisma.siteAttachment.findFirst({
      where: { id: attachmentId, tenantId, siteId },
    });

    if (!attachment) {
      throw new NotFoundException(this.i18n.translate('sites.errors.attachmentNotFound', {}, locale));
    }

    const signedUrl = await this.uploadService.getSignedUrl(DOCUMENT_BUCKET, attachment.fileUrl, 3600, locale);

    return { signedUrl, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async upload(
    tenantId: string,
    siteId: string,
    userId: string,
    file: Express.Multer.File,
    description: string | undefined,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const fileUrl = await this.uploadService.uploadFile(
      tenantId,
      'site-documents',
      siteId,
      file,
      ALLOWED_MIME_TYPES,
      MAX_SIZE_BYTES,
      locale,
    );

    const attachment = await this.prisma.siteAttachment.create({
      data: {
        tenantId,
        siteId,
        fileName: file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
    });

    const signedUrl = await this.resolveSignedUrl(attachment.fileUrl);

    await this.auditLog(tenantId, userId, 'SITE_DOCUMENT_UPLOADED', 'SITE', siteId, {
      fileName: file.originalname,
      fileSize: file.size,
    });

    return { ...attachment, fileUrl: signedUrl || attachment.fileUrl };
  }

  async remove(tenantId: string, siteId: string, attachmentId: string, userId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const attachment = await this.prisma.siteAttachment.findFirst({
      where: { id: attachmentId, tenantId, siteId },
    });

    if (!attachment) {
      throw new NotFoundException(this.i18n.translate('sites.errors.attachmentNotFound', {}, locale));
    }

    // Delete from storage
    try {
      await this.uploadService.deleteFile(DOCUMENT_BUCKET, attachment.fileUrl);
    } catch (e) {
      this.logger.warn(`Failed to delete file from storage: ${e.message}`);
    }

    await this.prisma.siteAttachment.delete({ where: { id: attachmentId } });

    await this.auditLog(tenantId, userId, 'SITE_DOCUMENT_DELETED', 'SITE', siteId, {
      fileName: attachment.fileName,
    });

    return { success: true };
  }

  private async resolveSignedUrl(filePath: string): Promise<string | null> {
    if (!filePath) return null;
    try {
      return await this.uploadService.getSignedUrl(DOCUMENT_BUCKET, filePath, 3600);
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
        data: { tenantId, userId, action, module, recordId, newValues },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }
  }
}

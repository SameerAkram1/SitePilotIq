import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { SiteAttachmentsService } from './site-attachments.service';
import { I18nService } from '../i18n/i18n.service';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/attachments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SiteAttachmentsController {
  constructor(
    private readonly attachmentsService: SiteAttachmentsService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.attachmentsService.findAll(tenantId, siteId, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Locale() locale: string,
  ) {
    if (!file) {
      throw new BadRequestException(this.i18n.translate('sites.errors.noFileUploaded', {}, locale));
    }
    return this.attachmentsService.upload(tenantId, siteId, userId, file, description, locale);
  }

  @Get(':attachmentId/download')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  async download(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('attachmentId') attachmentId: string,
    @Locale() locale: string,
    @Res() res: Response,
  ) {
    const { signedUrl, fileName } = await this.attachmentsService.getDownloadUrl(tenantId, siteId, attachmentId, locale);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.redirect(302, signedUrl);
  }

  @Delete(':attachmentId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('attachmentId') attachmentId: string,
    @Locale() locale: string,
  ) {
    return this.attachmentsService.remove(tenantId, siteId, attachmentId, userId, locale);
  }
}

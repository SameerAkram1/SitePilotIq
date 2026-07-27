import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { SitePhotosService } from './site-photos.service';
import { I18nService } from '../i18n/i18n.service';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/photos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SitePhotosController {
  constructor(
    private readonly photosService: SitePhotosService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('locationId') locationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Locale() locale: string,
  ) {
    return this.photosService.findAll(tenantId, siteId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      locationId,
      startDate,
      endDate,
    }, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.WORKER)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string,
    @Body('description') description: string,
    @Body('locationId') locationId: string,
    @Body('dprId') dprId: string,
    @Locale() locale: string,
  ) {
    if (!file) {
      throw new BadRequestException(this.i18n.translate('sites.errors.noFileUploaded', {}, locale));
    }
    return this.photosService.upload(tenantId, siteId, userId, file, { caption, description, locationId, dprId }, locale);
  }

  @Patch(':photoId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('photoId') photoId: string,
    @Body() dto: { caption?: string; description?: string; locationId?: string },
    @Locale() locale: string,
  ) {
    return this.photosService.update(tenantId, siteId, photoId, userId, dto, locale);
  }

  @Delete(':photoId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('photoId') photoId: string,
    @Locale() locale: string,
  ) {
    return this.photosService.remove(tenantId, siteId, photoId, userId, locale);
  }
}

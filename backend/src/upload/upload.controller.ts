import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Locale } from '../common/decorators/locale.decorator';
import { I18nService } from '../i18n/i18n.service';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const PATH_PATTERN = /^[a-zA-Z0-9_\-\/]+$/;

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly i18n: I18nService,
  ) {}

  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async uploadLogo(
    @CurrentUser('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Locale() locale: string,
  ) {
    const filePath = await this.uploadService.uploadFile(
      tenantId,
      'company-logos',
      'logos',
      file,
      IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE,
      locale,
    );

    return {
      success: true,
      data: { filePath },
      message: 'Logo uploaded successfully',
    };
  }

  @Post('profile-photo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async uploadProfilePhoto(
    @CurrentUser('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Locale() locale: string,
  ) {
    const filePath = await this.uploadService.uploadFile(
      tenantId,
      'profile-photos',
      'profiles',
      file,
      IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE,
      locale,
    );

    return {
      success: true,
      data: { filePath },
      message: 'Profile photo uploaded successfully',
    };
  }

  @Get('signed-url')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getSignedUrl(
    @CurrentUser('tenantId') tenantId: string,
    @Query('bucket') bucket: string,
    @Query('path') path: string,
    @Locale() locale: string,
  ) {
    const allowedBuckets = ['company-logos', 'profile-photos', 'project-documents'];
    if (!allowedBuckets.includes(bucket)) {
      throw new BadRequestException(
        this.i18n.translate('upload.errors.invalidBucket', {}, locale),
      );
    }

    if (!path || !PATH_PATTERN.test(path) || path.includes('..')) {
      throw new BadRequestException(
        this.i18n.translate('upload.errors.invalidPath', {}, locale),
      );
    }

    // Enforce tenant isolation: path must start with tenant's directory
    if (!path.startsWith(`${tenantId}/`) && !path.startsWith('logos/') && !path.startsWith('profiles/') && !path.startsWith('project-documents/')) {
      throw new BadRequestException(
        this.i18n.translate('upload.errors.pathAccessDenied', {}, locale),
      );
    }

    const signedUrl = await this.uploadService.getSignedUrl(bucket, path, 3600, locale);

    return {
      success: true,
      data: { signedUrl },
      message: 'Signed URL generated',
    };
  }
}

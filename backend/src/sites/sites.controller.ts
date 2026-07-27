import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { SitesService } from './sites.service';
import { SiteLocationsService } from './site-locations.service';
import { QrPdfService } from './qr-pdf.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  QuerySitesDto,
  CreateSiteLocationDto,
  UpdateSiteLocationDto,
} from './dto/site.dto';
import { UserRole } from '@prisma/client';

@Controller('sites')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly locationsService: SiteLocationsService,
    private readonly qrPdfService: QrPdfService,
    private readonly geocodingService: GeocodingService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSiteDto,
    @Locale() locale: string,
  ) {
    return this.sitesService.create(tenantId, dto, userId, locale);
  }

  @Post('geocode')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  async geocodeAddress(@Body('address') address: string) {
    return this.geocodingService.geocodeAddress(address);
  }

  @Post('geocode/search')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  async searchAddresses(@Body('address') address: string) {
    return this.geocodingService.searchAddresses(address);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: QuerySitesDto,
    @Locale() locale: string,
  ) {
    return this.sitesService.findAll(tenantId, filters);
  }

  @Get(':id')
  findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.sitesService.findById(tenantId, id, locale);
  }

  @Get(':id/dashboard')
  getDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.sitesService.getDashboard(tenantId, id, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @Locale() locale: string,
  ) {
    return this.sitesService.update(tenantId, id, dto, { id: userId, role }, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER)
  disable(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.sitesService.disable(tenantId, id, { id: userId, role }, locale);
  }

  @Post(':id/regenerate-qr')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER)
  @HttpCode(200)
  regenerateQr(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.sitesService.regenerateQr(tenantId, id, userId, locale);
  }

  @Get(':id/qr-code')
  async getQrCode(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
    @Locale() locale: string,
  ) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        project: { select: { name: true } },
        tenant: {
          include: {
            companySettings: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({ message: this.i18n.translate('sites.errors.notFound', {}, locale) });
    }

    if (format === 'pdf') {
      const pdfBuffer = await this.qrPdfService.generateQrPdf({
        siteId: site.id,
        tenantId: site.tenantId,
        qrCodeToken: site.qrCodeToken,
        siteName: site.name,
        siteCode: site.code,
        projectName: site.project.name,
        companyName: site.tenant.companySettings?.companyName || site.tenant.name,
        logoUrl: site.tenant.companySettings?.logoUrl || undefined,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="QR-${site.code}.pdf"`,
      });
      return res.send(pdfBuffer);
    }

    // Return existing QR image URL without regenerating or exposing token
    const qrCodeImageUrl = await this.sitesService.getQrCodeImage(tenantId, id, locale);
    return res.json({ qrCodeImageUrl });
  }

  // Location endpoints
  @Get(':id/locations')
  getLocations(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.locationsService.getTree(tenantId, id, locale);
  }

  @Post(':id/locations')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.PROJECT_MANAGER)
  createLocation(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateSiteLocationDto,
    @Locale() locale: string,
  ) {
    return this.locationsService.create(tenantId, id, dto, userId, locale);
  }

  @Patch('locations/:locId')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.PROJECT_MANAGER)
  updateLocation(
    @CurrentUser('tenantId') tenantId: string,
    @Param('locId') locId: string,
    @Body() dto: UpdateSiteLocationDto,
    @Locale() locale: string,
  ) {
    return this.locationsService.update(tenantId, locId, dto, locale);
  }

  @Delete('locations/:locId')
  @Roles(UserRole.ADMIN, UserRole.SITE_MANAGER)
  deleteLocation(
    @CurrentUser('tenantId') tenantId: string,
    @Param('locId') locId: string,
    @Locale() locale: string,
  ) {
    return this.locationsService.remove(tenantId, locId, locale);
  }

  @Get(':id/activity')
  async getActivity(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') siteId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Locale() locale: string,
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });
    if (!site) {
      return { data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } };
    }

    const siteRelatedModules = ['SITE', 'BOQ', 'IPC', 'VARIATION_ORDER', 'MEASUREMENT_BOOK', 'ASSIGNMENTS', 'SITE_LOCATION', 'SITE_PHOTO', 'DAILY_PROGRESS_REPORT'];

    const where = {
      tenantId,
      module: { in: siteRelatedModules },
      OR: [
        { recordId: siteId },
        { newValues: { path: ['siteId'], equals: siteId } },
      ],
    };

    const [logs, total] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: { user: { select: { id: true, fullName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        this.prisma.auditLog.count({ where }),
      ]),
    );

    return {
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { UploadService } from '../upload/upload.service';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);
  private supabase: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
    private readonly i18n: I18nService,
  ) {}

  private getSupabase(): SupabaseClient | null {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return null;
    if (!this.supabase) {
      this.supabase = new SupabaseClient(url, key);
    }
    return this.supabase;
  }

  async getSettings(tenantId: string, locale: string = 'en') {
    const settings = await this.prisma.companySettings.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            plan: true,
            trialEndsAt: true,
            status: true,
            maxUsers: true,
          },
        },
      },
    });

    if (!settings) {
      throw new NotFoundException(
        this.i18n.translate('companySettings.errors.notFound', {}, locale),
      );
    }

    // Generate signed URLs for file paths
    const result = { ...settings };

    if (settings.logoUrl && !settings.logoUrl.startsWith('http')) {
      // It's a file path — generate signed URL
      try {
        result.logoUrl = await this.uploadService.getSignedUrl('company-logos', settings.logoUrl, 3600, locale);
      } catch {
        result.logoUrl = null;
      }
    }

    return result;
  }

  async updateSettings(tenantId: string, dto: Record<string, any>, userId: string, locale: string = 'en') {
    const existing = await this.prisma.companySettings.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw new NotFoundException(
        this.i18n.translate('companySettings.errors.notFound', {}, locale),
      );
    }

    const allowedFields = [
      'companyName', 'website', 'vatNumber', 'taxId', 'registrationNumber',
      'phone', 'email', 'street', 'city', 'state', 'postalCode', 'country',
      'defaultCurrency', 'iban', 'bankName', 'swiftBic',
      'defaultLanguage', 'timezone', 'dateFormat', 'defaultVatRate',
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        updateData[key] = dto[key];
      }
    }

    const updated = await this.prisma.companySettings.update({
      where: { tenantId },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'SETTINGS_UPDATED',
        module: 'SETTINGS',
        oldValues: existing,
        newValues: updateData,
        ipAddress: null,
        userAgent: null,
      },
    });

    return updated;
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File, userId: string, locale: string = 'en') {
    const supabase = this.getSupabase();
    if (!supabase) {
      throw new ForbiddenException(
        this.i18n.translate('companySettings.errors.storageNotConfigured', {}, locale),
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ForbiddenException(
        this.i18n.translate('companySettings.errors.invalidImageType', {}, locale),
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new ForbiddenException(
        this.i18n.translate('companySettings.errors.imageTooLarge', {}, locale),
      );
    }

    const settings = await this.prisma.companySettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      throw new NotFoundException(
        this.i18n.translate('companySettings.errors.notFound', {}, locale),
      );
    }

    // Delete old logo if exists
    if (settings.logoUrl && !settings.logoUrl.startsWith('http')) {
      try {
        await supabase.storage.from('company-logos').remove([settings.logoUrl]);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Upload to private bucket — store path, not URL
    const filePath = await this.uploadService.uploadFile(
      tenantId,
      'company-logos',
      'logos',
      file,
      allowedTypes,
      2 * 1024 * 1024,
      locale,
    );

    const updated = await this.prisma.companySettings.update({
      where: { tenantId },
      data: { logoUrl: filePath }, // Store path, not URL
    });

    // Generate signed URL for response
    const signedUrl = await this.uploadService.getSignedUrl('company-logos', filePath, 3600, locale);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'LOGO_UPLOADED',
        module: 'SETTINGS',
        newValues: { logoPath: filePath },
        ipAddress: null,
        userAgent: null,
      },
    });

    return { ...updated, logoUrl: signedUrl };
  }
}

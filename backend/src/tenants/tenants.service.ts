import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Create a new tenant with admin user. SUPER_ADMIN only.
   */
  async createTenant(dto: CreateTenantDto, locale: string = 'en') {
    // Check slug uniqueness
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        this.i18n.translate('tenants.errors.slugExists', {}, locale),
      );
    }

    // Generate secure random temp password (16 chars)
    const tempPassword = this.generateTempPassword(16);
    const passwordHash = await argon2.hash(tempPassword);

    // Create tenant + company settings + admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.slug,
        },
      });

      const companySettings = await tx.companySettings.create({
        data: {
          tenantId: tenant.id,
          companyName: dto.tenantName,
          country: dto.country || 'AL',
          defaultCurrency: dto.defaultCurrency || 'ALL',
          defaultLanguage: dto.defaultLanguage || 'en',
          timezone: dto.timezone || 'Europe/Tirane',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName: dto.adminFullName,
          email: dto.adminEmail,
          passwordHash,
          role: 'ADMIN',
          status: 'PENDING',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      return { tenant, companySettings, adminUser, tempPassword };
    });

    return {
      tenant: result.tenant,
      adminUser: result.adminUser,
      tempPassword: result.tempPassword,
    };
  }

  /**
   * Generate a secure random password.
   */
  private generateTempPassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Get all tenants with user count. SUPER_ADMIN only.
   */
  async getAllTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single tenant by ID. SUPER_ADMIN only.
   */
  async getTenant(id: string, locale: string = 'en') {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        companySettings: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        this.i18n.translate('tenants.errors.notFound', {}, locale),
      );
    }

    return tenant;
  }

  /**
   * Toggle tenant active status. SUPER_ADMIN only.
   */
  async toggleTenantStatus(id: string, locale: string = 'en') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(
        this.i18n.translate('tenants.errors.notFound', {}, locale),
      );
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });
  }

  /**
   * Soft delete tenant. SUPER_ADMIN only.
   */
  async deleteTenant(id: string, locale: string = 'en') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(
        this.i18n.translate('tenants.errors.notFound', {}, locale),
      );
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }
}

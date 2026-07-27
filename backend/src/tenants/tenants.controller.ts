import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Locale } from '../common/decorators/locale.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(@Body() createTenantDto: CreateTenantDto, @Locale() locale: string) {
    const result = await this.tenantsService.createTenant(createTenantDto, locale);
    return {
      success: true,
      data: result,
      message: 'Tenant created successfully',
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    const tenants = await this.tenantsService.getAllTenants();
    return {
      success: true,
      data: tenants,
      message: 'Tenants retrieved successfully',
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async findOne(@Param('id') id: string, @Locale() locale: string) {
    const tenant = await this.tenantsService.getTenant(id, locale);
    return {
      success: true,
      data: tenant,
      message: 'Tenant retrieved successfully',
    };
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  async toggleStatus(@Param('id') id: string, @Locale() locale: string) {
    const tenant = await this.tenantsService.toggleTenantStatus(id, locale);
    return {
      success: true,
      data: tenant,
      message: `Tenant ${tenant.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }
}

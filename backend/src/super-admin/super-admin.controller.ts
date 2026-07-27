import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('tenants')
  async getTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.superAdminService.getTenants({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
    return {
      success: true,
      data: result,
      message: 'Tenants retrieved successfully',
    };
  }

  @Get('tenants/:id')
  async getTenantById(@Param('id') id: string) {
    const tenant = await this.superAdminService.getTenantById(id);
    return {
      success: true,
      data: tenant,
      message: 'Tenant retrieved successfully',
    };
  }

  @Patch('tenants/:id/status')
  async toggleTenantStatus(@Param('id') id: string) {
    const tenant = await this.superAdminService.toggleTenantStatus(id);
    return {
      success: true,
      data: tenant,
      message: 'Tenant status updated',
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.superAdminService.getStats();
    return {
      success: true,
      data: stats,
      message: 'Stats retrieved successfully',
    };
  }
}

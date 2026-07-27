import { Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanySettingsService } from './company-settings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Locale } from '../common/decorators/locale.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CompanySettingsController {
  constructor(private readonly settingsService: CompanySettingsService) {}

  @Get()
  async getSettings(@CurrentUser('tenantId') tenantId: string, @Locale() locale: string) {
    const settings = await this.settingsService.getSettings(tenantId, locale);
    return {
      success: true,
      data: settings,
      message: 'Settings retrieved successfully',
    };
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateSettings(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: Record<string, any>,
    @Locale() locale: string,
  ) {
    const settings = await this.settingsService.updateSettings(tenantId, body, userId, locale);
    return {
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    };
  }

  @Post('logo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Locale() locale: string,
  ) {
    const settings = await this.settingsService.uploadLogo(tenantId, file, userId, locale);
    return {
      success: true,
      data: settings,
      message: 'Logo uploaded successfully',
    };
  }
}

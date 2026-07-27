import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { DailyProgressReportsService } from './daily-progress-reports.service';
import { CreateDprDto, UpdateDprDto } from './dto/dpr.dto';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/dpr')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DailyProgressReportsController {
  constructor(private readonly dprService: DailyProgressReportsService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Locale() locale: string,
  ) {
    return this.dprService.findAll(tenantId, siteId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      startDate,
      endDate,
    }, locale);
  }

  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.dprService.findOne(tenantId, siteId, id, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateDprDto,
    @Locale() locale: string,
  ) {
    return this.dprService.create(tenantId, siteId, userId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDprDto,
    @Locale() locale: string,
  ) {
    return this.dprService.update(tenantId, siteId, id, userId, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.dprService.remove(tenantId, siteId, id, userId, locale);
  }
}

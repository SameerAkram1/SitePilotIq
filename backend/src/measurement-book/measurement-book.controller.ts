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
import { MeasurementBookService } from './measurement-book.service';
import { CreateMbEntryDto, UpdateMbEntryDto, QueryMbDto } from './dto/measurement-book.dto';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/measurements')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MeasurementBookController {
  constructor(private readonly mbService: MeasurementBookService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query() query: QueryMbDto,
    @Locale() locale: string,
  ) {
    return this.mbService.findAll(tenantId, siteId, query, locale);
  }

  @Get('aggregate')
  getAggregatedByBoqItem(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Locale() locale: string,
  ) {
    return this.mbService.getAggregatedByBoqItem(tenantId, siteId, startDate, endDate, locale);
  }

  @Get('stats')
  getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.mbService.getStats(tenantId, siteId, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.ENGINEER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateMbEntryDto,
    @Locale() locale: string,
  ) {
    return this.mbService.create(tenantId, siteId, userId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.ENGINEER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMbEntryDto,
    @Locale() locale: string,
  ) {
    return this.mbService.update(tenantId, siteId, id, userId, dto, locale);
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
    return this.mbService.remove(tenantId, siteId, id, userId, locale);
  }
}

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
import { VariationOrderService } from './variation-order.service';
import { CreateVariationOrderDto, UpdateVariationOrderDto, QueryVoDto } from './dto/variation-order.dto';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/variation-orders')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class VariationOrderController {
  constructor(private readonly voService: VariationOrderService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query() query: QueryVoDto,
    @Locale() locale: string,
  ) {
    return this.voService.findAll(tenantId, siteId, query, locale);
  }

  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.voService.findOne(tenantId, siteId, id, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateVariationOrderDto,
    @Locale() locale: string,
  ) {
    return this.voService.create(tenantId, siteId, userId, dto, locale);
  }

  @Patch(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  submit(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.voService.submit(tenantId, siteId, id, userId, locale);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER)
  approve(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.voService.approve(tenantId, siteId, id, userId, locale);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER)
  reject(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.voService.reject(tenantId, siteId, id, userId, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVariationOrderDto,
    @Locale() locale: string,
  ) {
    return this.voService.update(tenantId, siteId, id, dto, userId, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.voService.remove(tenantId, siteId, id, userId, locale);
  }
}

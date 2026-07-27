import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { UserRole } from '@prisma/client';

@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
    @Locale() locale: string,
  ) {
    return this.milestonesService.findAll(tenantId, projectId, locale);
  }

  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.milestonesService.findOne(tenantId, projectId, id, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
    @Locale() locale: string,
  ) {
    return this.milestonesService.create(tenantId, projectId, userId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @Locale() locale: string,
  ) {
    return this.milestonesService.update(tenantId, projectId, id, userId, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.milestonesService.remove(tenantId, projectId, id, userId, locale);
  }
}

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
import { ProjectCategoriesService } from './project-categories.service';
import {
  CreateProjectCategoryDto,
  UpdateProjectCategoryDto,
} from './dto/project-category.dto';
import { UserRole } from '@prisma/client';
import { Locale } from '../common/decorators/locale.decorator';

@Controller('project-categories')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProjectCategoriesController {
  constructor(
    private readonly categoriesService: ProjectCategoriesService,
  ) {}

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateProjectCategoryDto,
    @Locale() locale: string,
  ) {
    return this.categoriesService.create(tenantId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectCategoryDto,
    @Locale() locale: string,
  ) {
    return this.categoriesService.update(tenantId, id, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.categoriesService.remove(tenantId, id, locale);
  }
}

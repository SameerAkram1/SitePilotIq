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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { UserRole } from '@prisma/client';
import { Locale } from '../common/decorators/locale.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.departmentsService.findAll(tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateDepartmentDto,
    @Locale() locale: string,
  ) {
    return this.departmentsService.create(tenantId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Locale() locale: string,
  ) {
    return this.departmentsService.update(tenantId, id, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.departmentsService.remove(tenantId, id, locale);
  }
}

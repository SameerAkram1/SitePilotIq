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
import { PartnersService } from './partners.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  QueryPartnersDto,
  CreatePartnerNoteDto,
} from './dto';
import { UserRole } from '@prisma/client';

@Controller('partners')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.FINANCE_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePartnerDto,
    @Locale() locale: string,
  ) {
    return this.partnersService.create(tenantId, dto, userId, locale);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: QueryPartnersDto,
    @Locale() locale: string,
  ) {
    return this.partnersService.findAll(tenantId, filters);
  }

  @Get(':id')
  findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.partnersService.findById(tenantId, id, locale);
  }

  @Get(':id/ledger')
  getLedger(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.partnersService.getLedger(tenantId, id, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
    @Locale() locale: string,
  ) {
    return this.partnersService.update(tenantId, id, dto, { id: userId, role }, locale);
  }

  @Patch(':id/disable')
  @Roles(UserRole.ADMIN)
  disable(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.partnersService.disable(tenantId, id, { id: userId, role }, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.partnersService.delete(tenantId, id, { id: userId, role }, locale);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreatePartnerNoteDto,
    @Locale() locale: string,
  ) {
    return this.partnersService.addNote(tenantId, id, dto, userId, locale);
  }
}

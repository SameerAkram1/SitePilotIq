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
  Res,
  Header,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  QueryAssignmentsDto,
  ReassignDto,
  OverlapCheckDto,
} from './dto';
import { UserRole } from '@prisma/client';

@Controller('assignments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAssignmentDto,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.createAssignment(tenantId, dto, userId, locale);
  }

  // Named routes MUST come before @Get() catch-all
  @Get('stats')
  getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.getStats(tenantId, locale);
  }

  @Get('sites')
  getSitesWithAssignments(
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.getSitesWithAssignments(tenantId, locale);
  }

  @Get('available-workers')
  getAvailableWorkers(
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
    @Query('excludeSiteId') excludeSiteId?: string,
    @Query() query?: QueryAssignmentsDto,
  ) {
    return this.assignmentsService.getAvailableWorkers(tenantId, locale, excludeSiteId, query);
  }

  @Get('worker/:userId/history')
  getWorkerHistory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
    @Param('userId') userId: string,
    @Locale() locale: string,
    @Query() query?: QueryAssignmentsDto,
  ) {
    if (currentUserRole === UserRole.WORKER && currentUserId !== userId) {
      throw new ForbiddenException('You can only view your own assignment history');
    }
    return this.assignmentsService.getWorkerAssignmentHistory(tenantId, userId, query || {}, locale);
  }

  @Get('site/:siteId/trades')
  getTradeBreakdown(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.getTradeBreakdown(tenantId, siteId, locale);
  }

  @Get('overlap-check')
  checkOverlap(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: OverlapCheckDto,
  ) {
    return this.assignmentsService.checkOverlapWarning(tenantId, query.userId, query.startDate, query.endDate);
  }

  @Get('site/:siteId/export')
  @Header('Content-Type', 'text/csv')
  async exportSiteAssignments(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query() query: QueryAssignmentsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.assignmentsService.exportSiteAssignments(tenantId, siteId, query);
    res.setHeader('Content-Disposition', `attachment; filename="assignments-${siteId}.csv"`);
    return csv;
  }

  @Get('user/:userId')
  getUserAssignments(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
    @Param('userId') userId: string,
    @Query() query: QueryAssignmentsDto,
    @Locale() locale: string,
  ) {
    // Workers can only view their own assignments
    if (currentUserRole === UserRole.WORKER && currentUserId !== userId) {
      throw new ForbiddenException('You can only view your own assignments');
    }
    return this.assignmentsService.getAssignmentsForUser(tenantId, userId, query, locale);
  }

  // Catch-all @Get() MUST be last
  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') currentUserRole: UserRole,
    @Query() query: QueryAssignmentsDto,
    @Locale() locale: string,
  ) {
    if (query.siteId) {
      return this.assignmentsService.getAssignmentsForSite(tenantId, query.siteId, query, locale);
    }
    if (query.userId) {
      // Workers can only query their own assignments
      if (currentUserRole === UserRole.WORKER) {
        throw new ForbiddenException('Workers must specify their own userId');
      }
      return this.assignmentsService.getAssignmentsForUser(tenantId, query.userId, query, locale);
    }
    // Require siteId or userId — don't fallback to stats
    return this.assignmentsService.getStats(tenantId, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') requestingUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.updateAssignment(tenantId, id, dto, requestingUserId, locale);
  }

  @Patch(':id/end')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  end(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') requestingUserId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.endAssignment(tenantId, id, requestingUserId, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') requestingUserId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.cancelAssignment(tenantId, id, requestingUserId, locale);
  }

  @Post('reassign')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  reassign(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') requestingUserId: string,
    @Body() dto: ReassignDto,
    @Locale() locale: string,
  ) {
    return this.assignmentsService.reassignUser(tenantId, dto, requestingUserId, locale);
  }
}

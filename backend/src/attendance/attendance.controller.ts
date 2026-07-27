import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, AttendanceQueryDto, CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { UserRole } from '@prisma/client';

@Controller('attendance')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  checkIn(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CheckInDto,
    @Locale() locale: string,
  ) {
    return this.attendanceService.checkIn(userId, tenantId, dto, locale);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CheckOutDto,
    @Locale() locale: string,
  ) {
    return this.attendanceService.checkOut(userId, tenantId, dto, locale);
  }

  @Get('today')
  getTodayAttendance(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
  ) {
    return this.attendanceService.getTodayAttendance(userId, tenantId, locale);
  }

  @Get('site/:siteId')
  getSiteAttendance(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Locale() locale: string,
  ) {
    return this.attendanceService.getSiteAttendance(userId, tenantId, siteId, {
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    }, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateAttendanceDto,
    @Locale() locale: string,
  ) {
    return this.attendanceService.createAttendance(userId, tenantId, dto, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  update(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Locale() locale: string,
  ) {
    return this.attendanceService.updateAttendance(userId, tenantId, id, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  remove(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.attendanceService.removeAttendance(userId, tenantId, id, locale);
  }

  @Get('history')
  getAttendanceHistory(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: AttendanceQueryDto,
    @Locale() locale: string,
  ) {
    return this.attendanceService.getAttendanceHistory(userId, tenantId, query, locale);
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER)
  async exportAttendance(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('siteId') siteId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const csv = await this.attendanceService.exportCsv(userId, tenantId, { siteId, startDate, endDate });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-export-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  }
}

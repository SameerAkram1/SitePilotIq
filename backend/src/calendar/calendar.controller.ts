import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  getEvents(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type?: string,
  ) {
    return this.calendarService.getEvents(tenantId, startDate, endDate, type);
  }

  @Get('month')
  getMonthEvents(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.calendarService.getMonthEvents(
      tenantId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }
}

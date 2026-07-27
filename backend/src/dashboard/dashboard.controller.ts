import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getStats(tenantId);
  }

  @Get('financial')
  getFinancialOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getFinancialOverview(tenantId);
  }

  @Get('revenue-trend')
  getRevenueTrend(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getRevenueTrend(tenantId);
  }

  @Get('ipc-pipeline')
  getIpcPipeline(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getIpcPipeline(tenantId);
  }

  @Get('expenses-by-type')
  getExpensesByType(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getExpensesByType(tenantId);
  }

  @Get('project-status')
  getProjectStatusDistribution(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getProjectStatusDistribution(tenantId);
  }

  @Get('recent-activity')
  getRecentActivity(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getRecentActivity(tenantId);
  }

  @Get('upcoming-events')
  getUpcomingEvents(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getUpcomingEvents(tenantId);
  }
}

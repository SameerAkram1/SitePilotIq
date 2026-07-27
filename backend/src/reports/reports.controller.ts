import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('boq/:siteId/excel')
  async downloadBoqExcel(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateBoqExcel(tenantId, siteId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="boq-${siteId}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('boq/:siteId/pdf')
  async downloadBoqPdf(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateBoqPdf(tenantId, siteId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boq-${siteId}.pdf"`,
    });
    res.send(buffer);
  }

  @Get('dpr/:siteId/:dprId/pdf')
  async downloadDprPdf(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('dprId') dprId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateDprPdf(tenantId, siteId, dprId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dpr-${dprId}.pdf"`,
    });
    res.send(buffer);
  }

  @Get('expenses/:clientId/excel')
  async downloadExpensesExcel(
    @CurrentUser('tenantId') tenantId: string,
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateExpensesExcel(tenantId, clientId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="expenses-${clientId}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('expenses/:clientId/pdf')
  async downloadExpensesPdf(
    @CurrentUser('tenantId') tenantId: string,
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateExpensesPdf(tenantId, clientId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="expenses-${clientId}.pdf"`,
    });
    res.send(buffer);
  }

  @Get('site-summary/:siteId/pdf')
  async downloadSiteReportPdf(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateSiteSummaryPdf(tenantId, siteId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="site-report-${siteId}.pdf"`,
    });
    res.send(buffer);
  }
}

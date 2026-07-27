import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { IpcService } from './ipc.service';
import { IpcPdfService } from '../sites/ipc-pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIpcDto, SubmitIpcDto, CertifyIpcDto, RejectIpcDto, RecordPaymentDto, QueryIpcDto } from './dto/ipc.dto';
import { UserRole } from '@prisma/client';

@Controller('sites/:siteId/ipc')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class IpcController {
  constructor(
    private readonly ipcService: IpcService,
    private readonly ipcPdfService: IpcPdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query() query: QueryIpcDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.findAll(tenantId, siteId, query, locale);
  }

  @Get('stats')
  getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.ipcService.getStats(tenantId, siteId, locale);
  }

  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.ipcService.findOne(tenantId, siteId, id, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateIpcDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.create(tenantId, siteId, userId, dto, locale);
  }

  @Patch(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  submit(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: SubmitIpcDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.submit(tenantId, siteId, id, userId, dto, locale);
  }

  @Patch(':id/certify')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER, UserRole.FINANCE_MANAGER)
  certify(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: CertifyIpcDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.certify(tenantId, siteId, id, userId, dto, locale);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER, UserRole.FINANCE_MANAGER)
  reject(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: RejectIpcDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.reject(tenantId, siteId, id, userId, dto, locale);
  }

  @Patch(':id/payment')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  recordPayment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Locale() locale: string,
  ) {
    return this.ipcService.recordPayment(tenantId, siteId, id, userId, dto, locale);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  markPaid(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.ipcService.markPaid(tenantId, siteId, id, userId, locale);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const ipc = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId },
      include: {
        lineItems: {
          include: {
            boqItem: { select: { itemCode: true, description: true, unit: true } },
          },
        },
        site: {
          select: { name: true, code: true, currencyCode: true, retentionPercentage: true, advanceRecoveryAmount: true, project: { select: { name: true } } },
        },
      },
    });

    if (!ipc) {
      return res.status(404).json({ message: 'IPC not found' });
    }

    const buffer = await this.ipcPdfService.generateIpcPdf({
      ipcNumber: ipc.ipcNumber,
      billingStartDate: ipc.billingStartDate.toISOString().split('T')[0],
      billingEndDate: ipc.billingEndDate.toISOString().split('T')[0],
      status: ipc.status,
      isFinal: ipc.isFinal,
      siteName: ipc.site.name,
      siteCode: ipc.site.code,
      projectName: ipc.site.project.name,
      currencyCode: ipc.site.currencyCode,
      retentionPercentage: Number(ipc.site.retentionPercentage),
      advanceRecoveryAmount: Number(ipc.site.advanceRecoveryAmount),
      lineItems: ipc.lineItems.map((li) => ({
        itemCode: li.boqItem.itemCode,
        description: li.boqItem.description,
        unit: li.boqItem.unit,
        boqQuantity: Number(li.boqQuantity),
        boqUnitRate: Number(li.boqUnitRate),
        previousQuantity: Number(li.previousQuantity),
        previousAmount: Number(li.previousAmount),
        currentQuantity: Number(li.currentQuantity),
        currentAmount: Number(li.currentAmount),
        cumulativeQuantity: Number(li.cumulativeQuantity),
        cumulativeAmount: Number(li.cumulativeAmount),
        certifiedQuantity: li.certifiedQuantity ? Number(li.certifiedQuantity) : null,
        certifiedAmount: li.certifiedAmount ? Number(li.certifiedAmount) : null,
      })),
      grossClaimed: Number(ipc.grossClaimed),
      retentionDeduction: Number(ipc.retentionDeduction),
      netPayable: Number(ipc.netPayable),
      certifiedGross: ipc.certifiedGross ? Number(ipc.certifiedGross) : null,
      certifiedRetention: ipc.certifiedRetention ? Number(ipc.certifiedRetention) : null,
      certifiedNetPayable: ipc.certifiedNetPayable ? Number(ipc.certifiedNetPayable) : null,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="IPC-${String(ipc.ipcNumber).padStart(2, '0')}.pdf"`,
    });
    res.send(buffer);
  }
}

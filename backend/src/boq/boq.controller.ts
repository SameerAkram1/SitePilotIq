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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { BoqService } from './boq.service';
import { CreateBoqItemDto, BulkCreateBoqItemDto, UpdateBoqItemDto, QueryBoqDto } from './dto/boq.dto';
import { UserRole } from '@prisma/client';
import * as XLSX from 'xlsx';

const REQUIRED_HEADERS = ['Item_Code', 'Description', 'Unit', 'Estimated_Qty', 'Unit_Rate'];

@Controller('sites/:siteId/boq')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class BoqController {
  constructor(private readonly boqService: BoqService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Query() query: QueryBoqDto,
    @Locale() locale: string,
  ) {
    return this.boqService.findAll(tenantId, siteId, query, locale);
  }

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const wb = XLSX.utils.book_new();
    const wsData = [
      REQUIRED_HEADERS,
      ['1.0', 'Excavation for footings in soft soil', 'm3', 150, 25.00],
      ['1.1', 'Concrete foundation pouring', 'm3', 80, 120.00],
      ['2.0', 'Structural steel framework', 'T', 45, 850.00],
      ['2.1', 'Brick wall construction', 'm2', 500, 35.00],
      ['3.0', 'Electrical wiring installation', 'LS', 1, 15000.00],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'BoQ Template');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=boq-template.xlsx');
    res.send(buf);
  }

  @Get('export')
  async exportBoq(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ) {
    const items = await this.boqService.exportBoq(tenantId, siteId);

    const headers = ['Item_Code', 'Description', 'Unit', 'Estimated_Qty', 'Unit_Rate', 'Total_Amount', 'Section', 'Is_Baseline'];
    const rows = items.map((item) => [
      item.itemCode,
      item.description,
      item.unit,
      Number(item.estimatedQty),
      Number(item.unitRate),
      Number(item.totalAmount),
      item.section?.name || '',
      item.isBaseline ? 'Yes' : 'No',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'BoQ');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=boq-export-${siteId}.xlsx`);
    res.send(buf);
  }

  @Get('stats')
  getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.boqService.getStats(tenantId, siteId, locale);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  importFile(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Locale() locale: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.boqService.importFile(tenantId, siteId, userId, file, locale);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  bulkCreate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: BulkCreateBoqItemDto,
    @Locale() locale: string,
  ) {
    return this.boqService.bulkCreate(tenantId, siteId, userId, dto, locale);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateBoqItemDto,
    @Locale() locale: string,
  ) {
    return this.boqService.create(tenantId, siteId, userId, dto, locale);
  }

  @Post('baseline')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER)
  approveBaseline(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Locale() locale: string,
  ) {
    return this.boqService.approveBaseline(tenantId, siteId, userId, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_MANAGER, UserRole.CONTRACT_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBoqItemDto,
    @Locale() locale: string,
  ) {
    return this.boqService.update(tenantId, siteId, id, userId, dto, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONTRACT_MANAGER)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.boqService.remove(tenantId, siteId, id, userId, locale);
  }
}

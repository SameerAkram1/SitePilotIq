import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateBoqItemDto, BulkCreateBoqItemDto, UpdateBoqItemDto, QueryBoqDto } from './dto/boq.dto';
import { BoqUnit } from '@prisma/client';
import * as XLSX from 'xlsx';

const VALID_UNITS: string[] = Object.values(BoqUnit);
const REQUIRED_HEADERS = ['Item_Code', 'Description', 'Unit', 'Estimated_Qty', 'Unit_Rate'];

@Injectable()
export class BoqService {
  private readonly logger = new Logger(BoqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: QueryBoqDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      siteId,
      variationOrderId: null,
    };

    if (query.search) {
      where.OR = [
        { itemCode: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.boQItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { itemCode: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.boQItem.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(tenantId: string, siteId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const [totalItems, baselineItems, totalValue, draftValue] = await Promise.all([
      this.prisma.boQItem.count({
        where: { tenantId, siteId, variationOrderId: null },
      }),
      this.prisma.boQItem.count({
        where: { tenantId, siteId, isBaseline: true, variationOrderId: null },
      }),
      this.prisma.boQItem.aggregate({
        where: { tenantId, siteId, isBaseline: true, variationOrderId: null },
        _sum: { totalAmount: true },
      }),
      this.prisma.boQItem.aggregate({
        where: { tenantId, siteId, variationOrderId: null },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalItems,
      baselineItems,
      isBaselined: baselineItems > 0,
      totalContractValue: totalValue._sum.totalAmount || 0,
      totalDraftValue: draftValue._sum.totalAmount || 0,
    };
  }

  async exportBoq(tenantId: string, siteId: string) {
    await this.verifySiteAccess(tenantId, siteId, 'en');

    return this.prisma.boQItem.findMany({
      where: { tenantId, siteId, variationOrderId: null },
      include: { section: { select: { name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { itemCode: 'asc' }],
    });
  }

  generateTemplate(): string {
    return [
      REQUIRED_HEADERS.join(','),
      '1.0,Excavation for footings in soft soil,m3,150.00,25.00',
      '1.1,Concrete foundation pouring,m3,80.00,120.00',
      '2.0,Structural steel framework,T,45.00,850.00',
      '2.1,Brick wall construction,m2,500.00,35.00',
      '3.0,Electrical wiring installation,LS,1.00,15000.00',
    ].join('\n');
  }

  async importFile(
    tenantId: string,
    siteId: string,
    userId: string,
    file: Express.Multer.File,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);
    await this.ensureNotBaselined(tenantId, siteId, locale);

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

    if (rawData.length === 0) {
      throw new BadRequestException('File is empty or has no data rows');
    }

    const headers = Object.keys(rawData[0]);
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const errors: { row: number; message: string }[] = [];
    const items: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2;

      const itemCode = String(row['Item_Code'] ?? '').trim();
      const description = String(row['Description'] ?? '').trim();
      const unit = String(row['Unit'] ?? '').trim();
      const qtyStr = row['Estimated_Qty'];
      const rateStr = row['Unit_Rate'];

      if (!itemCode) {
        errors.push({ row: rowNum, message: 'Item_Code is required' });
        continue;
      }
      if (seenCodes.has(itemCode)) {
        errors.push({ row: rowNum, message: `Duplicate Item_Code "${itemCode}" — each code must be unique` });
        continue;
      }
      seenCodes.add(itemCode);
      if (!description) {
        errors.push({ row: rowNum, message: 'Description is required' });
        continue;
      }
      if (!unit || !VALID_UNITS.includes(unit)) {
        errors.push({ row: rowNum, message: `Unit must be one of: ${VALID_UNITS.join(', ')}` });
        continue;
      }

      const qty = parseFloat(String(qtyStr));
      const rate = parseFloat(String(rateStr));

      if (isNaN(qty) || qty <= 0) {
        errors.push({ row: rowNum, message: 'Estimated_Qty must be a positive number' });
        continue;
      }
      if (isNaN(rate) || rate <= 0) {
        errors.push({ row: rowNum, message: 'Unit_Rate must be a positive number' });
        continue;
      }

      items.push({
        tenantId,
        siteId,
        itemCode,
        description,
        unit: unit as BoqUnit,
        estimatedQty: qty,
        unitRate: rate,
        totalAmount: Math.round(qty * rate * 100) / 100,
        sortOrder: i,
        createdById: userId,
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: `Validation failed for ${errors.length} row(s)`,
        errors,
      });
    }

    // Check for existing codes in the database
    const existingItems = await this.prisma.boQItem.findMany({
      where: { tenantId, siteId, itemCode: { in: items.map((i) => i.itemCode) } },
      select: { itemCode: true },
    });

    if (existingItems.length > 0) {
      const existingCodes = existingItems.map((e) => e.itemCode);
      throw new BadRequestException({
        message: `Item codes already exist in the database`,
        errors: existingCodes.map((code) => ({
          row: 0,
          message: `Item code "${code}" already exists on this site`,
        })),
      });
    }

    const created = await this.prisma.boQItem.createMany({
      data: items,
    });

    await this.auditLog(tenantId, userId, 'BOQ_IMPORTED', 'BOQ', siteId, {
      siteId,
      count: created.count,
    });

    return { imported: created.count };
  }

  async bulkCreate(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: BulkCreateBoqItemDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);
    await this.ensureNotBaselined(tenantId, siteId, locale);

    const existingCodes = await this.prisma.boQItem.findMany({
      where: { tenantId, siteId, variationOrderId: null },
      select: { itemCode: true },
    });
    const codeSet = new Set(existingCodes.map((e) => e.itemCode));

    const errors: { index: number; message: string }[] = [];
    const items: any[] = [];
    let maxSort = 0;

    const currentMax = await this.prisma.boQItem.aggregate({
      where: { tenantId, siteId },
      _max: { sortOrder: true },
    });
    maxSort = currentMax._max.sortOrder || 0;

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];

      if (codeSet.has(item.itemCode)) {
        errors.push({ index: i, message: `Duplicate item code: ${item.itemCode}` });
        continue;
      }

      codeSet.add(item.itemCode);
      maxSort++;

      items.push({
        tenantId,
        siteId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        estimatedQty: item.estimatedQty,
        unitRate: item.unitRate,
        totalAmount: Math.round(item.estimatedQty * item.unitRate * 100) / 100,
        sortOrder: item.sortOrder ?? maxSort,
        createdById: userId,
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }

    const created = await this.prisma.boQItem.createMany({ data: items });

    await this.auditLog(tenantId, userId, 'BOQ_BULK_CREATED', 'BOQ', siteId, {
      count: created.count,
    });

    return { created: created.count };
  }

  async create(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: CreateBoqItemDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);
    await this.ensureNotBaselined(tenantId, siteId, locale);

    const item = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.boQItem.findFirst({
        where: { tenantId, siteId, itemCode: dto.itemCode, variationOrderId: null },
      });

      if (existing) {
        throw new ConflictException('Item code ' + dto.itemCode + ' already exists');
      }

      const maxSort = await tx.boQItem.aggregate({
        where: { tenantId, siteId },
        _max: { sortOrder: true },
      });

      return tx.boQItem.create({
        data: {
          tenantId,
          siteId,
          itemCode: dto.itemCode,
          description: dto.description,
          unit: dto.unit,
          estimatedQty: dto.estimatedQty,
          unitRate: dto.unitRate,
          totalAmount: Math.round(dto.estimatedQty * dto.unitRate * 100) / 100,
          sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder || 0) + 1,
          ...(dto.sectionId && { sectionId: dto.sectionId }),
          createdById: userId,
        },
      });
    });

    await this.auditLog(tenantId, userId, 'BOQ_ITEM_CREATED', 'BOQ', item.id, {
      itemCode: dto.itemCode,
    });

    return item;
  }

  async approveBaseline(
    tenantId: string,
    siteId: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const items = await this.prisma.boQItem.findMany({
      where: { tenantId, siteId, variationOrderId: null },
    });

    if (items.length === 0) {
      throw new BadRequestException('No BoQ items to baseline');
    }

    const alreadyBaselined = items.some((i) => i.isBaseline);
    if (alreadyBaselined) {
      throw new ConflictException('BoQ is already baselined');
    }

    await this.prisma.boQItem.updateMany({
      where: { tenantId, siteId, variationOrderId: null },
      data: { isBaseline: true },
    });

    await this.auditLog(tenantId, userId, 'BOQ_BASELINED', 'BOQ', siteId, {
      itemCount: items.length,
      totalValue: items.reduce((sum, i) => sum + Number(i.totalAmount), 0),
    });

    return {
      success: true,
      itemCount: items.length,
      totalContractValue: items.reduce((sum, i) => sum + Number(i.totalAmount), 0),
    };
  }

  async update(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: UpdateBoqItemDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const item = await this.prisma.boQItem.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!item) {
      throw new NotFoundException('BoQ item not found');
    }

    if (item.isBaseline) {
      throw new BadRequestException('Cannot edit baselined items. Create a Variation Order instead.');
    }

    if (dto.itemCode && dto.itemCode !== item.itemCode) {
      const existing = await this.prisma.boQItem.findFirst({
        where: { tenantId, siteId, itemCode: dto.itemCode, id: { not: id }, variationOrderId: null },
      });
      if (existing) {
        throw new ConflictException(`Item code ${dto.itemCode} already exists`);
      }
    }

    const qty = dto.estimatedQty ?? Number(item.estimatedQty);
    const rate = dto.unitRate ?? Number(item.unitRate);

    const updated = await this.prisma.boQItem.update({
      where: { id },
      data: {
        ...(dto.itemCode && { itemCode: dto.itemCode }),
        ...(dto.description && { description: dto.description }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.estimatedQty !== undefined && { estimatedQty: dto.estimatedQty }),
        ...(dto.unitRate !== undefined && { unitRate: dto.unitRate }),
        totalAmount: Math.round(qty * rate * 100) / 100,
        ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.auditLog(tenantId, userId, 'BOQ_ITEM_UPDATED', 'BOQ', item.id, {
      itemCode: updated.itemCode,
      changes: dto,
    });

    return updated;
  }

  async remove(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const item = await this.prisma.boQItem.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!item) {
      throw new NotFoundException('BoQ item not found');
    }

    if (item.isBaseline) {
      throw new BadRequestException('Cannot delete baselined items');
    }

    await this.prisma.boQItem.delete({ where: { id } });

    await this.auditLog(tenantId, userId, 'BOQ_ITEM_DELETED', 'BOQ', id, {
      itemCode: item.itemCode,
      description: item.description,
    });

    return { success: true };
  }

  private async verifySiteAccess(tenantId: string, siteId: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });
    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }
    return site;
  }

  private async ensureNotBaselined(tenantId: string, siteId: string, locale: string) {
    const count = await this.prisma.boQItem.count({
      where: { tenantId, siteId, isBaseline: true, variationOrderId: null },
    });
    if (count > 0) {
      throw new BadRequestException('BoQ is already baselined. Use Variation Orders for changes.');
    }
  }

  private async auditLog(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    recordId: string,
    newValues?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { tenantId, userId, action, module, recordId, newValues },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }
  }
}

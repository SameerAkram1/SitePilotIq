import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateMbEntryDto, UpdateMbEntryDto, QueryMbDto } from './dto/measurement-book.dto';
import { BoqUnit, Prisma } from '@prisma/client';
import { getTodayUtc, parseDateAsUtc } from '../common/utils/date-utils';
import { UNIT_DIMENSIONS, calculateQuantity } from '../common/utils/finance-utils';

@Injectable()
export class MeasurementBookService {
  private readonly logger = new Logger(MeasurementBookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: QueryMbDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, siteId };

    if (query.boqItemId) {
      where.boqItemId = query.boqItemId;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.gte = parseDateAsUtc(query.startDate);
      if (query.endDate) {
        const end = parseDateAsUtc(query.endDate);
        dateFilter.lte = new Date(end.getTime() + 86400000);
      }
      where.entryDate = dateFilter;
    }

    const [entries, total] = await Promise.all([
      this.prisma.measurementBookEntry.findMany({
        where,
        include: {
          boqItem: { select: { id: true, itemCode: true, description: true, unit: true } },
          enteredBy: { select: { id: true, fullName: true } },
        },
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.measurementBookEntry.count({ where }),
    ]);

    return {
      data: entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAggregatedByBoqItem(
    tenantId: string,
    siteId: string,
    startDate: string,
    endDate: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const start = parseDateAsUtc(startDate);
    const end = parseDateAsUtc(endDate);
    const endExclusive = new Date(end.getTime() + 86400000);

    const results = await this.prisma.measurementBookEntry.groupBy({
      by: ['boqItemId'],
      where: {
        tenantId,
        siteId,
        entryDate: { gte: start, lt: endExclusive },
      },
      _sum: { totalQuantity: true },
      _count: { id: true },
    });

    const boqItemIds = results.map((r) => r.boqItemId);
    const boqItems = await this.prisma.boQItem.findMany({
      where: { id: { in: boqItemIds } },
      select: { id: true, itemCode: true, description: true, unit: true, unitRate: true, estimatedQty: true },
    });

    const boqMap = new Map(boqItems.map((b) => [b.id, b]));

    return results.map((r) => {
      const boqItem = boqMap.get(r.boqItemId);
      const totalQty = Number(r._sum.totalQuantity || 0);
      return {
        boqItemId: r.boqItemId,
        boqItemCode: boqItem?.itemCode || '',
        boqDescription: boqItem?.description || '',
        unit: boqItem?.unit || '',
        unitRate: boqItem?.unitRate || 0,
        estimatedQty: boqItem?.estimatedQty || 0,
        totalQuantity: totalQty,
        entryCount: r._count.id,
        totalAmount: boqItem ? totalQty * Number(boqItem.unitRate) : 0,
      };
    });
  }

  async getStats(tenantId: string, siteId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const today = getTodayUtc();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    const [totalEntries, todayEntries, monthEntries, totalQuantity, cumulativeByItem] = await Promise.all([
      this.prisma.measurementBookEntry.count({
        where: { tenantId, siteId },
      }),
      this.prisma.measurementBookEntry.count({
        where: { tenantId, siteId, entryDate: today },
      }),
      this.prisma.measurementBookEntry.count({
        where: { tenantId, siteId, entryDate: { gte: monthStart } },
      }),
      this.prisma.measurementBookEntry.aggregate({
        where: { tenantId, siteId },
        _sum: { totalQuantity: true },
      }),
      this.prisma.measurementBookEntry.groupBy({
        by: ['boqItemId'],
        where: { tenantId, siteId },
        _sum: { totalQuantity: true },
      }),
    ]);

    const cumulativeMap: Record<string, number> = {};
    for (const entry of cumulativeByItem) {
      cumulativeMap[entry.boqItemId] = Number(entry._sum.totalQuantity || 0);
    }

    return {
      totalEntries,
      todayEntries,
      monthEntries,
      totalQuantityLogged: Number(totalQuantity._sum.totalQuantity || 0),
      cumulativeByItem: cumulativeMap,
    };
  }

  async create(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: CreateMbEntryDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const boqItem = await this.prisma.boQItem.findFirst({
      where: { id: dto.boqItemId, tenantId, siteId },
    });

    if (!boqItem) {
      throw new NotFoundException('BoQ item not found');
    }

    const requiredDims = UNIT_DIMENSIONS[boqItem.unit];

    if (requiredDims > 0) {
      if (requiredDims >= 1 && (!dto.dim1 || dto.dim1 <= 0)) {
        throw new BadRequestException(`Dimension 1 (Length) is required for unit ${boqItem.unit}`);
      }
      if (requiredDims >= 2 && (!dto.dim2 || dto.dim2 <= 0)) {
        throw new BadRequestException(`Dimension 2 (Width) is required for unit ${boqItem.unit}`);
      }
      if (requiredDims >= 3 && (!dto.dim3 || dto.dim3 <= 0)) {
        throw new BadRequestException(`Dimension 3 (Height) is required for unit ${boqItem.unit}`);
      }
    }

    const totalQuantity = requiredDims > 0
      ? calculateQuantity(boqItem.unit, dto.dim1, dto.dim2, dto.dim3)
      : calculateQuantity(boqItem.unit, null, null, null, dto.totalQuantity);

    if (totalQuantity === null || totalQuantity <= 0) {
      throw new BadRequestException('Total quantity must be greater than zero');
    }

    const entry = await this.prisma.measurementBookEntry.create({
      data: {
        tenantId,
        siteId,
        boqItemId: dto.boqItemId,
        entryDate: parseDateAsUtc(dto.entryDate),
        description: dto.description,
        dim1: dto.dim1,
        dim2: dto.dim2,
        dim3: dto.dim3,
        totalQuantity,
        enteredById: userId,
      },
      include: {
        boqItem: { select: { id: true, itemCode: true, description: true, unit: true } },
        enteredBy: { select: { id: true, fullName: true } },
      },
    });

    await this.auditLog(tenantId, userId, 'MB_ENTRY_CREATED', 'MEASUREMENT_BOOK', entry.id, {
      boqItemId: dto.boqItemId,
      entryDate: dto.entryDate,
      totalQuantity,
    });

    return entry;
  }

  async update(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: UpdateMbEntryDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const entry = await this.prisma.measurementBookEntry.findFirst({
      where: { id, tenantId, siteId },
      include: { boqItem: true },
    });

    if (!entry) {
      throw new NotFoundException('Measurement entry not found');
    }

    const updateData: any = {};

    if (dto.entryDate) updateData.entryDate = parseDateAsUtc(dto.entryDate);
    if (dto.description) updateData.description = dto.description;

    if (dto.dim1 !== undefined) updateData.dim1 = dto.dim1;
    if (dto.dim2 !== undefined) updateData.dim2 = dto.dim2;
    if (dto.dim3 !== undefined) updateData.dim3 = dto.dim3;

    if (dto.totalQuantity !== undefined) {
      updateData.totalQuantity = dto.totalQuantity;
    } else if (dto.dim1 !== undefined || dto.dim2 !== undefined || dto.dim3 !== undefined) {
      const d1 = dto.dim1 !== undefined ? dto.dim1 : Number(entry.dim1);
      const d2 = dto.dim2 !== undefined ? dto.dim2 : Number(entry.dim2);
      const d3 = dto.dim3 !== undefined ? dto.dim3 : Number(entry.dim3);
      const recalculated = calculateQuantity(entry.boqItem.unit, d1, d2, d3);
      if (recalculated !== null && recalculated > 0) {
        updateData.totalQuantity = recalculated;
      }
    }

    const updated = await this.prisma.measurementBookEntry.update({
      where: { id },
      data: updateData,
      include: {
        boqItem: { select: { id: true, itemCode: true, description: true, unit: true } },
        enteredBy: { select: { id: true, fullName: true } },
      },
    });

    await this.auditLog(tenantId, userId, 'MB_ENTRY_UPDATED', 'MEASUREMENT_BOOK', id, {
      boqItemId: entry.boqItemId,
      changes: dto,
    });

    return updated;
  }

  async remove(tenantId: string, siteId: string, id: string, userId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const entry = await this.prisma.measurementBookEntry.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!entry) {
      throw new NotFoundException('Measurement entry not found');
    }

    await this.prisma.measurementBookEntry.delete({ where: { id } });

    await this.auditLog(tenantId, userId, 'MB_ENTRY_DELETED', 'MEASUREMENT_BOOK', id, {
      boqItemId: entry.boqItemId,
      totalQuantity: Number(entry.totalQuantity),
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

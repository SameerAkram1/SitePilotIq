import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import {
  CreateVariationOrderDto,
  UpdateVariationOrderDto,
  QueryVoDto,
  VoItemAction,
} from './dto/variation-order.dto';
import { VariationOrderStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VariationOrderService {
  private readonly logger = new Logger(VariationOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: QueryVoDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, siteId };
    if (query.status) where.status = query.status;

    const [records, total] = await Promise.all([
      this.prisma.variationOrder.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
          _count: { select: { variationOrderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.variationOrder.count({ where }),
    ]);

    return {
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, siteId: string, id: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId },
      include: {
        variationOrderItems: {
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Variation order not found');
    }

    return record;
  }

  async create(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: CreateVariationOrderDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    if (dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Validate ADD items don't have duplicate codes
    const addItems = dto.items.filter((i) => i.action === VoItemAction.ADD);
    const addCodes = addItems.map((i) => i.itemCode);
    const uniqueAddCodes = new Set(addCodes);
    if (uniqueAddCodes.size < addCodes.length) {
      throw new BadRequestException('Duplicate item codes in ADD items');
    }

    // Validate MODIFY items have boqItemId
    const modifyItems = dto.items.filter((i) => i.action === VoItemAction.MODIFY);
    for (const item of modifyItems) {
      if (!item.boqItemId) {
        throw new BadRequestException(`MODIFY item "${item.itemCode}" requires boqItemId`);
      }
      const boqItem = await this.prisma.boQItem.findFirst({
        where: { id: item.boqItemId, tenantId, siteId, isBaseline: true },
      });
      if (!boqItem) {
        throw new BadRequestException(`BoQ item ${item.boqItemId} not found or not baselined`);
      }
    }

    // Check ADD items don't conflict with existing codes
    if (addCodes.length > 0) {
      const existing = await this.prisma.boQItem.findMany({
        where: { tenantId, siteId, itemCode: { in: addCodes } },
        select: { itemCode: true },
      });
      if (existing.length > 0) {
        throw new BadRequestException(
          `Item codes already exist: ${existing.map((e) => e.itemCode).join(', ')}`,
        );
      }
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const lastVo = await tx.variationOrder.findFirst({
        where: { tenantId, siteId },
        orderBy: { createdAt: 'desc' },
        select: { voNumber: true },
      });
      const nextNumber = (lastVo?.voNumber || 0) + 1;

      const vo = await tx.variationOrder.create({
        data: {
          tenantId,
          siteId,
          voNumber: nextNumber,
          title: dto.title,
          description: dto.description,
          status: 'DRAFT',
          createdById: userId,
        },
      });

      const voItems = dto.items.map((item) => ({
        tenantId,
        variationOrderId: vo.id,
        action: item.action,
        boqItemId: item.action === VoItemAction.MODIFY ? item.boqItemId : null,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        estimatedQty: item.estimatedQty,
        unitRate: item.unitRate,
        totalAmount: Math.round(item.estimatedQty * item.unitRate * 100) / 100,
        originalQty: null as any,
        originalRate: null as any,
      }));

      // For MODIFY items, fetch original values
      for (let i = 0; i < voItems.length; i++) {
        if (dto.items[i].action === VoItemAction.MODIFY && dto.items[i].boqItemId) {
          const original = await tx.boQItem.findUnique({
            where: { id: dto.items[i].boqItemId! },
            select: { estimatedQty: true, unitRate: true },
          });
          voItems[i].originalQty = original?.estimatedQty ?? null;
          voItems[i].originalRate = original?.unitRate ?? null;
        }
      }

      await tx.variationOrderItem.createMany({ data: voItems });

      return vo;
    });

    await this.auditLog(tenantId, userId, 'VO_CREATED', 'VARIATION_ORDER', record.id, {
      voNumber: record.voNumber,
      title: dto.title,
      itemCount: dto.items.length,
    });

    return this.findOne(tenantId, siteId, record.id, locale);
  }

  async submit(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId, status: 'DRAFT' },
    });

    if (!record) {
      throw new NotFoundException('Draft variation order not found');
    }

    const updated = await this.prisma.variationOrder.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });

    await this.auditLog(tenantId, userId, 'VO_SUBMITTED', 'VARIATION_ORDER', id, {
      voNumber: record.voNumber,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'VO_UPDATE',
      title: `VO-${String(record.voNumber).padStart(2, '0')} submitted`,
      message: `Variation order has been submitted for approval`,
      linkUrl: `/sites/${siteId}/variation-orders`,
    });

    return this.findOne(tenantId, siteId, id, locale);
  }

  async approve(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId, status: 'SUBMITTED' },
      include: { variationOrderItems: true },
    });

    if (!record) {
      throw new NotFoundException('Submitted variation order not found');
    }

    // Apply changes to BoQ
    await this.prisma.$transaction(async (tx) => {
      for (const voItem of record.variationOrderItems) {
        if (voItem.action === 'ADD') {
          // Create new BoQ item
          const maxSort = await tx.boQItem.aggregate({
            where: { tenantId, siteId },
            _max: { sortOrder: true },
          });

          await tx.boQItem.create({
            data: {
              tenantId,
              siteId,
              itemCode: voItem.itemCode,
              description: voItem.description,
              unit: voItem.unit,
              estimatedQty: voItem.estimatedQty,
              unitRate: voItem.unitRate,
              totalAmount: voItem.totalAmount,
              isBaseline: true,
              variationOrderId: id,
              sortOrder: (maxSort._max.sortOrder || 0) + 1,
              createdById: userId,
            },
          });
        } else if (voItem.action === 'MODIFY' && voItem.boqItemId) {
          // Update existing BoQ item
          await tx.boQItem.update({
            where: { id: voItem.boqItemId },
            data: {
              estimatedQty: voItem.estimatedQty,
              unitRate: voItem.unitRate,
              totalAmount: voItem.totalAmount,
            },
          });
        }
      }

      await tx.variationOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
    });

    await this.auditLog(tenantId, userId, 'VO_APPROVED', 'VARIATION_ORDER', id, {
      voNumber: record.voNumber,
      itemCount: record.variationOrderItems.length,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'VO_UPDATE',
      title: `VO-${String(record.voNumber).padStart(2, '0')} approved`,
      message: `Variation order has been approved and applied to BoQ`,
      linkUrl: `/sites/${siteId}/variation-orders`,
    });

    return this.findOne(tenantId, siteId, id, locale);
  }

  async reject(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId, status: 'SUBMITTED' },
    });

    if (!record) {
      throw new NotFoundException('Submitted variation order not found');
    }

    const updated = await this.prisma.variationOrder.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.auditLog(tenantId, userId, 'VO_REJECTED', 'VARIATION_ORDER', id, {
      voNumber: record.voNumber,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'VO_UPDATE',
      title: `VO-${String(record.voNumber).padStart(2, '0')} rejected`,
      message: `Variation order has been rejected`,
      linkUrl: `/sites/${siteId}/variation-orders`,
    });

    return this.findOne(tenantId, siteId, id, locale);
  }

  async update(
    tenantId: string,
    siteId: string,
    id: string,
    dto: UpdateVariationOrderDto,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId, status: 'DRAFT' },
      include: { variationOrderItems: true },
    });

    if (!record) {
      throw new NotFoundException('Draft variation order not found');
    }

    // Update VO title/description
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;

    // If items provided, replace them
    if (dto.items) {
      await this.prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.variationOrderItem.deleteMany({
          where: { variationOrderId: id },
        });

        // Create new items
        for (const voItem of dto.items!) {
          const totalAmount = voItem.estimatedQty * voItem.unitRate;
          await tx.variationOrderItem.create({
            data: {
              tenantId,
              variationOrderId: id,
              boqItemId: voItem.boqItemId || null,
              action: voItem.action,
              itemCode: voItem.itemCode,
              description: voItem.description,
              unit: voItem.unit,
              estimatedQty: voItem.estimatedQty,
              unitRate: voItem.unitRate,
              totalAmount,
            },
          });
        }

        // Update VO title/description
        await tx.variationOrder.update({
          where: { id },
          data: updateData,
        });
      });
    } else if (Object.keys(updateData).length > 0) {
      await this.prisma.variationOrder.update({
        where: { id },
        data: updateData,
      });
    }

    await this.auditLog(tenantId, userId, 'VO_UPDATED', 'VARIATION_ORDER', id, {
      voNumber: record.voNumber,
    });

    return this.findOne(tenantId, siteId, id, locale);
  }

  async remove(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.variationOrder.findFirst({
      where: { id, tenantId, siteId, status: 'DRAFT' },
    });

    if (!record) {
      throw new NotFoundException('Draft variation order not found');
    }

    // Delete items first, then the VO
    await this.prisma.$transaction(async (tx) => {
      await tx.variationOrderItem.deleteMany({
        where: { variationOrderId: id },
      });
      await tx.variationOrder.delete({
        where: { id },
      });
    });

    await this.auditLog(tenantId, userId, 'VO_DELETED', 'VARIATION_ORDER', id, {
      voNumber: record.voNumber,
    });

    return { message: 'Variation order deleted successfully' };
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

  private async notifySiteMembers(
    tenantId: string,
    siteId: string,
    excludeUserId: string,
    dto: { type: string; title: string; message: string; linkUrl?: string },
  ) {
    try {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId },
        select: { siteManagerId: true, projectId: true },
      });
      if (!site) return;

      const userIds: string[] = [];
      if (site.siteManagerId && site.siteManagerId !== excludeUserId) {
        userIds.push(site.siteManagerId);
      }

      const project = await this.prisma.project.findFirst({
        where: { id: site.projectId },
        select: { projectManagerId: true },
      });
      if (project?.projectManagerId && project.projectManagerId !== excludeUserId) {
        userIds.push(project.projectManagerId);
      }

      if (userIds.length > 0) {
        await this.notificationsService.createMany(tenantId, userIds, dto);
      }
    } catch (e) {
      this.logger.warn(`Failed to create notifications: ${e.message}`);
    }
  }
}

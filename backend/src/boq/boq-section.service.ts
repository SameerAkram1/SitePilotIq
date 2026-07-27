import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateBoqSectionDto, UpdateBoqSectionDto } from './dto/boq-section.dto';

@Injectable()
export class BoqSectionService {
  private readonly logger = new Logger(BoqSectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string, siteId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const sections = await this.prisma.boqSection.findMany({
      where: { tenantId, siteId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return sections;
  }

  async findOne(tenantId: string, siteId: string, id: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const section = await this.prisma.boqSection.findFirst({
      where: { id, tenantId, siteId },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemCode: 'asc' }],
        },
      },
    });

    if (!section) {
      throw new NotFoundException('BoQ section not found');
    }

    return section;
  }

  async create(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: CreateBoqSectionDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const existing = await this.prisma.boqSection.findFirst({
      where: { tenantId, siteId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Section code "${dto.code}" already exists`);
    }

    const maxSort = await this.prisma.boqSection.aggregate({
      where: { tenantId, siteId },
      _max: { sortOrder: true },
    });

    const section = await this.prisma.boqSection.create({
      data: {
        tenantId,
        siteId,
        code: dto.code,
        name: dto.name,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder || 0) + 1,
      },
    });

    await this.auditLog(tenantId, userId, 'BOQ_SECTION_CREATED', 'BOQ', section.id, {
      code: dto.code,
      name: dto.name,
    });

    return section;
  }

  async update(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: UpdateBoqSectionDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const section = await this.prisma.boqSection.findFirst({
      where: { id, tenantId, siteId },
    });

    if (!section) {
      throw new NotFoundException('BoQ section not found');
    }

    if (dto.code && dto.code !== section.code) {
      const existing = await this.prisma.boqSection.findFirst({
        where: { tenantId, siteId, code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Section code "${dto.code}" already exists`);
      }
    }

    const updated = await this.prisma.boqSection.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.auditLog(tenantId, userId, 'BOQ_SECTION_UPDATED', 'BOQ', id, {
      changes: dto,
    });

    return updated;
  }

  async remove(tenantId: string, siteId: string, id: string, userId: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const section = await this.prisma.boqSection.findFirst({
      where: { id, tenantId, siteId },
      include: { _count: { select: { items: true } } },
    });

    if (!section) {
      throw new NotFoundException('BoQ section not found');
    }

    if (section._count.items > 0) {
      // Move items to unsectioned (set sectionId to null)
      await this.prisma.boQItem.updateMany({
        where: { sectionId: id },
        data: { sectionId: null },
      });
    }

    await this.prisma.boqSection.delete({ where: { id } });

    await this.auditLog(tenantId, userId, 'BOQ_SECTION_DELETED', 'BOQ', id, {
      code: section.code,
      name: section.name,
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

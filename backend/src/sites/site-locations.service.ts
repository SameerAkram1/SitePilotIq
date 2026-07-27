import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import {
  CreateSiteLocationDto,
  UpdateSiteLocationDto,
} from './dto/site.dto';

export interface LocationTree {
  id: string;
  name: string;
  levelType: string;
  sortOrder: number;
  children: LocationTree[];
}

@Injectable()
export class SiteLocationsService {
  private readonly logger = new Logger(SiteLocationsService.name);

  constructor(private readonly prisma: PrismaService, private readonly i18n: I18nService) {}

  async create(tenantId: string, siteId: string, dto: CreateSiteLocationDto, userId: string, locale: string) {
    // Verify site belongs to tenant
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    // If parentId provided, verify parent belongs to same site
    if (dto.parentId) {
      const parent = await this.prisma.siteLocation.findFirst({
        where: { id: dto.parentId, siteId, tenantId, isDeleted: false },
      });

      if (!parent) {
        throw new BadRequestException(this.i18n.translate('sites.errors.parentLocationNotFound', {}, locale));
      }
    }

    const location = await this.prisma.siteLocation.create({
      data: {
        tenantId,
        siteId,
        name: dto.name,
        levelType: dto.levelType,
        parentId: dto.parentId || null,
        sortOrder: dto.sortOrder || 0,
      },
    });

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: userId,
          action: 'SITE_LOCATION_CREATED',
          module: 'SITES',
          recordId: siteId,
          newValues: { name: dto.name, levelType: dto.levelType },
        },
      });
    } catch (e) {
      // Audit log failure is non-critical
    }

    return location;
  }

  async getTree(tenantId: string, siteId: string, locale: string) {
    // Verify site belongs to tenant
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });

    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }

    // Fetch all locations for site in one query (avoid N+1)
    const locations = await this.prisma.siteLocation.findMany({
      where: { siteId, tenantId, isDeleted: false },
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree in application code
    return this.buildTree(locations);
  }

  async update(
    tenantId: string,
    locationId: string,
    dto: UpdateSiteLocationDto,
    locale: string,
  ) {
    const location = await this.prisma.siteLocation.findFirst({
      where: { id: locationId, tenantId, isDeleted: false },
    });

    if (!location) {
      throw new NotFoundException(this.i18n.translate('sites.errors.locationNotFound', {}, locale));
    }

    // If changing parent, prevent circular references
    if (dto.parentId && dto.parentId !== location.parentId) {
      if (dto.parentId === locationId) {
        throw new BadRequestException(this.i18n.translate('sites.errors.cannotSelfParent', {}, locale));
      }

      const isCircular = await this.isDescendant(tenantId, location.siteId, locationId, dto.parentId);
      if (isCircular) {
        throw new BadRequestException(this.i18n.translate('sites.errors.cannotSelfParent', {}, locale));
      }
    }

    return this.prisma.siteLocation.update({
      where: { id: locationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.levelType && { levelType: dto.levelType }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async remove(tenantId: string, locationId: string, locale: string) {
    const location = await this.prisma.siteLocation.findFirst({
      where: { id: locationId, tenantId, isDeleted: false },
      include: { _count: { select: { children: { where: { isDeleted: false } } } } },
    });

    if (!location) {
      throw new NotFoundException(this.i18n.translate('sites.errors.locationNotFound', {}, locale));
    }

    if (location._count.children > 0) {
      throw new BadRequestException(
        this.i18n.translate('sites.errors.cannotDeleteWithChildren', { name: location.name, count: location._count.children }, locale),
      );
    }

    return this.prisma.siteLocation.update({
      where: { id: locationId },
      data: { isDeleted: true },
    });
  }

  /**
   * Build hierarchical tree from flat array.
   */
  private buildTree(
    locations: Array<{
      id: string;
      name: string;
      levelType: string;
      sortOrder: number;
      parentId: string | null;
    }>,
    parentId: string | null = null,
  ): LocationTree[] {
    return locations
      .filter((loc) => loc.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        levelType: loc.levelType,
        sortOrder: loc.sortOrder,
        children: this.buildTree(locations, loc.id),
      }));
  }

  /**
   * Check if a location is a descendant of another location.
   * Used to prevent circular references.
   */
  private async isDescendant(
    tenantId: string,
    siteId: string,
    ancestorId: string,
    descendantId: string,
  ): Promise<boolean> {
    const locations = await this.prisma.siteLocation.findMany({
      where: { siteId, tenantId, isDeleted: false },
      select: { id: true, parentId: true },
    });

    // Build parent map
    const parentMap = new Map<string, string | null>();
    for (const loc of locations) {
      parentMap.set(loc.id, loc.parentId);
    }

    // Walk up from descendantId to see if we reach ancestorId
    let current: string | null = descendantId;
    while (current) {
      if (current === ancestorId) return true;
      current = parentMap.get(current) ?? null;
    }

    return false;
  }
}

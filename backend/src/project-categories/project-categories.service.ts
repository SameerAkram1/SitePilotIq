import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProjectCategoryDto,
  UpdateProjectCategoryDto,
} from './dto/project-category.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class ProjectCategoriesService {
  private readonly logger = new Logger(ProjectCategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.projectCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
  }

  async create(tenantId: string, dto: CreateProjectCategoryDto, locale: string = 'en') {
    const existing = await this.prisma.projectCategory.findFirst({
      where: { tenantId, name: dto.name, isActive: true },
    });

    if (existing) {
      throw new ConflictException(
        this.i18n.translate('projectCategories.errors.nameExists', {}, locale),
      );
    }

    return this.prisma.projectCategory.create({
      data: { tenantId, name: dto.name },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProjectCategoryDto, locale: string = 'en') {
    const category = await this.prisma.projectCategory.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException(
        this.i18n.translate('projectCategories.errors.notFound', {}, locale),
      );
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.projectCategory.findFirst({
        where: { tenantId, name: dto.name, isActive: true, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          this.i18n.translate('projectCategories.errors.nameExists', {}, locale),
        );
      }
    }

    return this.prisma.projectCategory.update({
      where: { id },
      data: { ...(dto.name && { name: dto.name }) },
    });
  }

  async remove(tenantId: string, id: string, locale: string = 'en') {
    const category = await this.prisma.projectCategory.findFirst({
      where: { id, tenantId, isActive: true },
      include: { _count: { select: { projects: true } } },
    });

    if (!category) {
      throw new NotFoundException(
        this.i18n.translate('projectCategories.errors.notFound', {}, locale),
      );
    }

    if (category._count.projects > 0) {
      throw new ConflictException(
        this.i18n.translate('projectCategories.errors.cannotDeleteWithProjects', { name: category.name, count: category._count.projects }, locale),
      );
    }

    return this.prisma.projectCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

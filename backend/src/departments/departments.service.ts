import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async create(tenantId: string, dto: CreateDepartmentDto, locale: string = 'en') {
    const existing = await this.prisma.department.findFirst({
      where: { tenantId, name: dto.name, isActive: true },
    });

    if (existing) {
      throw new ConflictException(
        this.i18n.translate('departments.errors.nameExists', {}, locale),
      );
    }

    return this.prisma.department.create({
      data: { tenantId, name: dto.name, code: dto.code },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto, locale: string = 'en') {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!department) {
      throw new NotFoundException(
        this.i18n.translate('departments.errors.notFound', {}, locale),
      );
    }

    if (dto.name && dto.name !== department.name) {
      const existing = await this.prisma.department.findFirst({
        where: { tenantId, name: dto.name, isActive: true, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          this.i18n.translate('departments.errors.nameExists', {}, locale),
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
      },
    });
  }

  async remove(tenantId: string, id: string, locale: string = 'en') {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId, isActive: true },
      include: { _count: { select: { users: true } } },
    });

    if (!department) {
      throw new NotFoundException(
        this.i18n.translate('departments.errors.notFound', {}, locale),
      );
    }

    if (department._count.users > 0) {
      throw new ConflictException(
        this.i18n.translate('departments.errors.cannotDeleteWithUsers', { name: department.name, count: department._count.users }, locale),
      );
    }

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

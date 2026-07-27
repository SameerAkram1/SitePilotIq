import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  QueryPartnersDto,
  CreatePartnerNoteDto,
} from './dto';
import { generatePartnerCode } from '../common/utils/code-generator.util';
import { I18nService } from '../i18n/i18n.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(tenantId: string, dto: CreatePartnerDto, createdById: string, locale: string) {
    if (!dto.isClient && !dto.isSupplier && !dto.isSubcontractor) {
      throw new BadRequestException(
        this.i18n.translate('partners.errors.mustBeAtLeastOne', {}, locale),
      );
    }

    if (dto.vatNumber) {
      const existing = await this.prisma.partner.findFirst({
        where: {
          tenantId,
          vatNumber: dto.vatNumber,
          isDeleted: false,
        },
      });
      if (existing) {
        throw new BadRequestException(
          this.i18n.translate('partners.errors.vatExists', {}, locale),
        );
      }
    }

    if (dto.paymentTerm === 'CUSTOM' && !dto.customPaymentDays) {
      throw new BadRequestException(
        this.i18n.translate('partners.errors.customPaymentDaysRequired', {}, locale),
      );
    }

    const code = await generatePartnerCode(this.prisma, tenantId);

    const partner = await this.prisma.partner.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        legalName: dto.legalName || null,
        vatNumber: dto.vatNumber || null,
        registrationNumber: dto.registrationNumber || null,
        dunsNumber: dto.dunsNumber || null,
        leiCode: dto.leiCode || null,
        category: dto.category,
        industry: dto.industry || null,
        status: 'ACTIVE',
        isClient: dto.isClient,
        isSupplier: dto.isSupplier,
        isSubcontractor: dto.isSubcontractor,
        contactPerson: dto.contactPerson || null,
        phone: dto.phone || null,
        email: dto.email || null,
        website: dto.website || null,
        street: dto.street || null,
        city: dto.city || null,
        state: dto.state || null,
        postalCode: dto.postalCode || null,
        country: dto.country || null,
        openingBalance: dto.openingBalance ?? 0,
        creditLimit: dto.creditLimit ?? null,
        paymentTerm: dto.paymentTerm,
        customPaymentDays: dto.paymentTerm === 'CUSTOM' ? dto.customPaymentDays : null,
        defaultDiscountPct: dto.defaultDiscountPct ?? 0,
        taxCategory: dto.taxCategory || null,
        bankName: dto.bankName || null,
        bankAccountIban: dto.bankAccountIban || null,
        swiftBic: dto.swiftBic || null,
        riskLevel: dto.riskLevel,
        notes: dto.notes || null,
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (dto.notes) {
      await this.prisma.partnerNote.create({
        data: {
          tenantId,
          partnerId: partner.id,
          noteText: dto.notes,
          authorId: createdById,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: createdById,
        action: 'PARTNER_CREATED',
        module: 'PARTNERS',
        recordId: partner.id,
        newValues: { name: dto.name, code },
      },
    });

    return partner;
  }

  async findAll(tenantId: string, filters: QueryPartnersDto) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.isClient === 'true') where.isClient = true;
    if (filters.isSupplier === 'true') where.isSupplier = true;
    if (filters.isSubcontractor === 'true') where.isSubcontractor = true;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { vatNumber: { contains: filters.search, mode: 'insensitive' } },
        { legalName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const allowedSortBy = ['createdAt', 'name', 'code', 'status', 'category', 'riskLevel'];
    const sortBy = allowedSortBy.includes(filters.sortBy || '') ? filters.sortBy! : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(tenantId: string, id: string, locale: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        partnerNotes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    return partner;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePartnerDto,
    requestingUser: { id: string; role: UserRole },
    locale: string,
  ) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    const isClient = dto.isClient ?? partner.isClient;
    const isSupplier = dto.isSupplier ?? partner.isSupplier;
    const isSubcontractor = dto.isSubcontractor ?? partner.isSubcontractor;

    if (!isClient && !isSupplier && !isSubcontractor) {
      throw new BadRequestException(
        this.i18n.translate('partners.errors.mustBeAtLeastOne', {}, locale),
      );
    }

    if (dto.status === 'BLACKLISTED' && partner.status !== 'BLACKLISTED') {
      if (!dto.notes) {
        throw new BadRequestException(
          this.i18n.translate('partners.errors.blacklistNoteRequired', {}, locale),
        );
      }
    }

    if (dto.vatNumber && dto.vatNumber !== partner.vatNumber) {
      const existing = await this.prisma.partner.findFirst({
        where: {
          tenantId,
          vatNumber: dto.vatNumber,
          id: { not: id },
          isDeleted: false,
        },
      });
      if (existing) {
        throw new BadRequestException(
          this.i18n.translate('partners.errors.vatExists', {}, locale),
        );
      }
    }

    const oldValues = {
      name: partner.name,
      status: partner.status,
      isClient: partner.isClient,
      isSupplier: partner.isSupplier,
      isSubcontractor: partner.isSubcontractor,
      riskLevel: partner.riskLevel,
    };

    const updated = await this.prisma.partner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
        ...(dto.dunsNumber !== undefined && { dunsNumber: dto.dunsNumber }),
        ...(dto.leiCode !== undefined && { leiCode: dto.leiCode }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.isClient !== undefined && { isClient: dto.isClient }),
        ...(dto.isSupplier !== undefined && { isSupplier: dto.isSupplier }),
        ...(dto.isSubcontractor !== undefined && { isSubcontractor: dto.isSubcontractor }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.street !== undefined && { street: dto.street }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.openingBalance !== undefined && { openingBalance: dto.openingBalance }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.paymentTerm !== undefined && { paymentTerm: dto.paymentTerm }),
        ...(dto.customPaymentDays !== undefined && { customPaymentDays: dto.customPaymentDays }),
        ...(dto.defaultDiscountPct !== undefined && { defaultDiscountPct: dto.defaultDiscountPct }),
        ...(dto.taxCategory !== undefined && { taxCategory: dto.taxCategory }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.bankAccountIban !== undefined && { bankAccountIban: dto.bankAccountIban }),
        ...(dto.swiftBic !== undefined && { swiftBic: dto.swiftBic }),
        ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
      },
    });

    if (dto.notes) {
      await this.prisma.partnerNote.create({
        data: {
          tenantId,
          partnerId: id,
          noteText: dto.notes,
          authorId: requestingUser.id,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUser.id,
        action: 'PARTNER_UPDATED',
        module: 'PARTNERS',
        recordId: id,
        oldValues,
        newValues: dto as any,
      },
    });

    return updated;
  }

  async disable(tenantId: string, id: string, requestingUser: { id: string; role: UserRole }, locale: string) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(this.i18n.translate('partners.errors.onlyAdminCanDisable', {}, locale));
    }

    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    const projectsWithPartner = await this.prisma.project.findMany({
      where: {
        clientId: id,
        isDeleted: false,
        status: { not: 'CANCELLED' },
      },
      select: { code: true, name: true },
    });

    if (projectsWithPartner.length > 0) {
      throw new BadRequestException(
        this.i18n.translate('partners.errors.cannotDisableWithProjects', {
          name: partner.name,
          projects: projectsWithPartner.map((p) => p.code).join(', '),
        }, locale),
      );
    }

    await this.prisma.partner.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUser.id,
        action: 'PARTNER_DISABLED',
        module: 'PARTNERS',
        recordId: id,
        oldValues: { status: partner.status },
        newValues: { status: 'INACTIVE' },
      },
    });

    return { message: 'Partner disabled successfully' };
  }

  async delete(tenantId: string, id: string, requestingUser: { id: string; role: UserRole }, locale: string) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(this.i18n.translate('partners.errors.onlyAdminCanDelete', {}, locale));
    }

    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    const projectCount = await this.prisma.project.count({
      where: { clientId: id },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        this.i18n.translate('partners.errors.cannotDeleteWithHistory', {
          name: partner.name,
          count: projectCount,
        }, locale),
      );
    }

    await this.prisma.partner.update({
      where: { id },
      data: { isDeleted: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUser.id,
        action: 'PARTNER_DELETED',
        module: 'PARTNERS',
        recordId: id,
      },
    });

    return { message: 'Partner deleted successfully' };
  }

  async addNote(
    tenantId: string,
    partnerId: string,
    dto: CreatePartnerNoteDto,
    authorId: string,
    locale: string,
  ) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    const note = await this.prisma.partnerNote.create({
      data: {
        tenantId,
        partnerId,
        noteText: dto.noteText,
        authorId,
      },
      include: {
        author: {
          select: { id: true, fullName: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: authorId,
        action: 'PARTNER_NOTE_ADDED',
        module: 'PARTNERS',
        recordId: partnerId,
      },
    });

    return note;
  }

  async getLedger(tenantId: string, id: string, locale: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(this.i18n.translate('partners.errors.notFound', {}, locale));
    }

    // Stub — full ledger requires Billing module
    return {
      invoicedAmount: null,
      receivedAmount: null,
      purchasedAmount: null,
      paidAmount: null,
      runningBalance: null,
      message: 'Ledger will be available once Billing module is implemented',
    };
  }
}

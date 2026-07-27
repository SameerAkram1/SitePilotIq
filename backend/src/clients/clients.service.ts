import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClientDto,
  UpdateClientDto,
  QueryClientsDto,
  CreateContactDto,
  UpdateContactDto,
  CreateClientNoteDto,
  UpdateClientNoteDto,
  CreateBudgetDto,
  CreateExpenseDto,
} from './dto';
import { generateClientCode } from '../common/utils/code-generator.util';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(tenantId: string, dto: CreateClientDto, createdById: string, locale: string) {
    if (dto.paymentTerm === 'CUSTOM' && !dto.customPaymentDays) {
      throw new BadRequestException(
        this.i18n.translate('clients.errors.customPaymentDaysRequired', {}, locale),
      );
    }

    if (dto.vatNumber) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, vatNumber: dto.vatNumber, isDeleted: false },
      });
      if (existing) {
        throw new BadRequestException(
          this.i18n.translate('clients.errors.vatExists', {}, locale),
        );
      }
    }

    const code = await generateClientCode(this.prisma, tenantId);

    const client = await this.prisma.client.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        legalName: dto.legalName || null,
        email: dto.email || null,
        phone: dto.phone || null,
        website: dto.website || null,
        logo: dto.logo || null,
        street: dto.street || null,
        city: dto.city || null,
        state: dto.state || null,
        postalCode: dto.postalCode || null,
        country: dto.country || null,
        industry: dto.industry || null,
        vatNumber: dto.vatNumber || null,
        registrationNumber: dto.registrationNumber || null,
        category: dto.category,
        currencyCode: dto.currencyCode || 'USD',
        creditLimit: dto.creditLimit ?? null,
        paymentTerm: dto.paymentTerm,
        customPaymentDays: dto.paymentTerm === 'CUSTOM' ? dto.customPaymentDays : null,
        openingBalance: dto.openingBalance ?? 0,
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

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: createdById,
        action: 'CLIENT_CREATED',
        module: 'CLIENTS',
        recordId: client.id,
        newValues: { name: dto.name, code },
      },
    });

    return client;
  }

  async findAll(tenantId: string, filters: QueryClientsDto) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.industry) where.industry = filters.industry;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { vatNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const allowedSortBy = ['createdAt', 'name', 'code', 'status', 'category'];
    const sortBy = allowedSortBy.includes(filters.sortBy || '') ? filters.sortBy! : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          _count: {
            select: { projects: true, contacts: true, expenses: true },
          },
        },
      }),
      this.prisma.client.count({ where }),
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
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        clientNotes: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, fullName: true } } },
        },
        budgets: { orderBy: { createdAt: 'desc' } },
        _count: {
          select: { projects: true, expenses: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    return client;
  }

  async getDashboard(tenantId: string, id: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const [
      projectCount,
      activeProjectCount,
      siteCount,
      activeSiteCount,
      expenseAgg,
      paidExpenseAgg,
      recentExpenses,
      recentNotes,
    ] = await Promise.all([
      this.prisma.project.count({ where: { clientId: id, isDeleted: false } }),
      this.prisma.project.count({ where: { clientId: id, isDeleted: false, status: 'ACTIVE' } }),
      this.prisma.site.count({
        where: { project: { clientId: id, isDeleted: false }, isDeleted: false },
      }),
      this.prisma.site.count({
        where: { project: { clientId: id, isDeleted: false }, isDeleted: false, status: 'ACTIVE' },
      }),
      this.prisma.clientExpense.aggregate({
        where: { clientId: id, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.clientExpense.aggregate({
        where: { clientId: id, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.clientExpense.findMany({
        where: { clientId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.clientNote.findMany({
        where: { clientId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { author: { select: { id: true, fullName: true } } },
      }),
    ]);

    const totalInvoiced = Number(expenseAgg._sum.totalAmount || 0);
    const totalPaid = Number(paidExpenseAgg._sum.totalAmount || 0);
    const outstanding = totalInvoiced - totalPaid;

    const projects = await this.prisma.project.findMany({
      where: { clientId: id, isDeleted: false },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        deadline: true,
        _count: { select: { sites: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeSites = await this.prisma.site.findMany({
      where: { project: { clientId: id, isDeleted: false }, isDeleted: false, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        project: { select: { name: true } },
      },
    });

    return {
      client: {
        id: client.id,
        name: client.name,
        code: client.code,
        status: client.status,
        currencyCode: client.currencyCode,
      },
      stats: {
        totalProjects: projectCount,
        activeProjects: activeProjectCount,
        totalSites: siteCount,
        activeSites: activeSiteCount,
        totalInvoiced,
        totalPaid,
        outstanding,
      },
      projects,
      activeSites,
      recentExpenses,
      recentNotes,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto, userId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    if (dto.vatNumber && dto.vatNumber !== client.vatNumber) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, vatNumber: dto.vatNumber, id: { not: id }, isDeleted: false },
      });
      if (existing) {
        throw new BadRequestException(
          this.i18n.translate('clients.errors.vatExists', {}, locale),
        );
      }
    }

    if (dto.paymentTerm === 'CUSTOM' && !dto.customPaymentDays) {
      throw new BadRequestException(
        this.i18n.translate('clients.errors.customPaymentDaysRequired', {}, locale),
      );
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.street !== undefined && { street: dto.street }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.paymentTerm !== undefined && {
          paymentTerm: dto.paymentTerm,
          customPaymentDays: dto.paymentTerm === 'CUSTOM' ? dto.customPaymentDays : null,
        }),
        ...(dto.openingBalance !== undefined && { openingBalance: dto.openingBalance }),
        ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CLIENT_UPDATED',
        module: 'CLIENTS',
        recordId: id,
        oldValues: { name: client.name, status: client.status },
        newValues: { name: updated.name, status: updated.status },
      },
    });

    return updated;
  }

  async disable(tenantId: string, id: string, userId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const activeProjects = await this.prisma.project.count({
      where: { clientId: id, isDeleted: false, status: 'ACTIVE' },
    });

    if (activeProjects > 0) {
      throw new BadRequestException(
        this.i18n.translate('clients.errors.hasActiveProjects', {}, locale),
      );
    }

    const disabled = await this.prisma.client.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_DISABLED',
          module: 'CLIENTS',
          recordId: id,
          newValues: { status: 'INACTIVE' },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return disabled;
  }

  async remove(tenantId: string, id: string, userId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const projectCount = await this.prisma.project.count({
      where: { clientId: id, isDeleted: false },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        this.i18n.translate('clients.errors.hasProjects', {}, locale),
      );
    }

    const removed = await this.prisma.client.update({
      where: { id },
      data: { isDeleted: true },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_REMOVED',
          module: 'CLIENTS',
          recordId: id,
          newValues: { name: client.name },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return removed;
  }

  async addContact(tenantId: string, clientId: string, dto: CreateContactDto, userId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    if (dto.isPrimary) {
      await this.prisma.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.clientContact.create({
      data: {
        tenantId,
        clientId,
        name: dto.name,
        role: dto.role || null,
        email: dto.email || null,
        phone: dto.phone || null,
        isPrimary: dto.isPrimary,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_CONTACT_ADDED',
          module: 'CLIENTS',
          recordId: clientId,
          newValues: { contactId: contact.id, name: dto.name },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return contact;
  }

  async updateContact(
    tenantId: string,
    clientId: string,
    contactId: string,
    dto: UpdateContactDto,
    userId: string,
    locale: string,
  ) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, tenantId },
    });

    if (!contact) {
      throw new NotFoundException(this.i18n.translate('clients.errors.contactNotFound', {}, locale));
    }

    if (dto.isPrimary) {
      await this.prisma.clientContact.updateMany({
        where: { clientId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_CONTACT_UPDATED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { name: contact.name },
          newValues: { name: updated.name },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return updated;
  }

  async deleteContact(tenantId: string, clientId: string, contactId: string, userId: string, locale: string) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, tenantId },
    });

    if (!contact) {
      throw new NotFoundException(this.i18n.translate('clients.errors.contactNotFound', {}, locale));
    }

    await this.prisma.clientContact.delete({ where: { id: contactId } });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_CONTACT_DELETED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { contactId, name: contact.name },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { success: true };
  }

  async addNote(
    tenantId: string,
    clientId: string,
    dto: CreateClientNoteDto,
    authorId: string,
    locale: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const note = await this.prisma.clientNote.create({
      data: {
        tenantId,
        clientId,
        content: dto.content,
        type: dto.type,
        title: dto.title || null,
        status: dto.status || 'DRAFT',
        priority: dto.priority || 'MEDIUM',
        noteDate: dto.noteDate ? new Date(dto.noteDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isReminder: dto.isReminder || false,
        reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : null,
        authorId,
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: authorId,
          action: 'CLIENT_NOTE_ADDED',
          module: 'CLIENTS',
          recordId: clientId,
          newValues: { noteId: note.id, type: dto.type },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return note;
  }

  async updateNote(
    tenantId: string,
    clientId: string,
    noteId: string,
    dto: UpdateClientNoteDto,
    userId: string,
    locale: string,
  ) {
    const note = await this.prisma.clientNote.findFirst({
      where: { id: noteId, clientId, tenantId },
    });

    if (!note) {
      throw new NotFoundException(this.i18n.translate('clients.errors.noteNotFound', {}, locale));
    }

    const updated = await this.prisma.clientNote.update({
      where: { id: noteId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.noteDate !== undefined && { noteDate: dto.noteDate ? new Date(dto.noteDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isReminder !== undefined && { isReminder: dto.isReminder }),
        ...(dto.reminderDate !== undefined && { reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : null }),
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_NOTE_UPDATED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { noteId },
          newValues: { changes: dto as any },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return updated;
  }

  async deleteNote(tenantId: string, clientId: string, noteId: string, userId: string, locale: string) {
    const note = await this.prisma.clientNote.findFirst({
      where: { id: noteId, clientId, tenantId },
    });

    if (!note) {
      throw new NotFoundException(this.i18n.translate('clients.errors.noteNotFound', {}, locale));
    }

    await this.prisma.clientNote.delete({ where: { id: noteId } });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_NOTE_DELETED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { noteId, title: note.title },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { success: true };
  }

  async getUpcomingReminders(tenantId: string, clientId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [upcoming, overdue] = await Promise.all([
      this.prisma.clientNote.findMany({
        where: {
          clientId,
          tenantId,
          isReminder: true,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'SKIPPED'] },
          reminderDate: { gte: now, lte: thirtyDaysFromNow },
        },
        orderBy: { reminderDate: 'asc' },
        take: 10,
        include: { author: { select: { id: true, fullName: true } } },
      }),
      this.prisma.clientNote.findMany({
        where: {
          clientId,
          tenantId,
          isReminder: true,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'SKIPPED'] },
          reminderDate: { lt: now },
        },
        orderBy: { reminderDate: 'desc' },
        take: 10,
        include: { author: { select: { id: true, fullName: true } } },
      }),
    ]);

    return { upcoming, overdue };
  }

  async getBudgets(tenantId: string, clientId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    return this.prisma.clientBudget.findMany({
      where: { clientId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBudget(
    tenantId: string,
    clientId: string,
    dto: CreateBudgetDto,
    userId: string,
    locale: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const budget = await this.prisma.clientBudget.create({
      data: {
        tenantId,
        clientId,
        name: dto.name,
        description: dto.description || null,
        totalAmount: dto.totalAmount,
        currencyCode: dto.currencyCode || client.currencyCode,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_BUDGET_CREATED',
          module: 'CLIENTS',
          recordId: clientId,
          newValues: { budgetId: budget.id, name: dto.name, totalAmount: Number(dto.totalAmount) },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return budget;
  }

  async updateBudget(
    tenantId: string,
    clientId: string,
    budgetId: string,
    dto: Partial<CreateBudgetDto>,
    userId: string,
    locale: string,
  ) {
    const budget = await this.prisma.clientBudget.findFirst({
      where: { id: budgetId, clientId, tenantId },
    });

    if (!budget) {
      throw new NotFoundException(this.i18n.translate('clients.errors.budgetNotFound', {}, locale));
    }

    const updated = await this.prisma.clientBudget.update({
      where: { id: budgetId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_BUDGET_UPDATED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { name: budget.name, totalAmount: Number(budget.totalAmount) },
          newValues: { name: updated.name, totalAmount: Number(updated.totalAmount) },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return updated;
  }

  async getExpenses(tenantId: string, clientId: string, query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = { clientId, tenantId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.clientExpense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          project: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clientExpense.count({ where }),
    ]);

    const summary = await this.prisma.clientExpense.aggregate({
      where: { clientId, tenantId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });

    const paidSummary = await this.prisma.clientExpense.aggregate({
      where: { clientId, tenantId, status: 'PAID' },
      _sum: { totalAmount: true },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAmount: Number(summary._sum.totalAmount || 0),
        paidAmount: Number(paidSummary._sum.totalAmount || 0),
        outstanding: Number(summary._sum.totalAmount || 0) - Number(paidSummary._sum.totalAmount || 0),
      },
    };
  }

  async createExpense(
    tenantId: string,
    clientId: string,
    dto: CreateExpenseDto,
    createdById: string,
    locale: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const taxAmount = dto.taxAmount || 0;
    const totalAmount = dto.amount + taxAmount;

    const expense = await this.prisma.clientExpense.create({
      data: {
        tenantId,
        clientId,
        projectId: dto.projectId || null,
        type: dto.type,
        referenceNumber: dto.referenceNumber || null,
        description: dto.description,
        amount: dto.amount,
        taxAmount,
        totalAmount,
        date: dto.date ? new Date(dto.date) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentMethod: dto.paymentMethod || null,
        notes: dto.notes || null,
        createdById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: createdById,
        action: 'CLIENT_EXPENSE_CREATED',
        module: 'CLIENTS',
        recordId: clientId,
        newValues: { expenseId: expense.id, type: dto.type, totalAmount },
      },
    });

    if (expense.status !== 'CANCELLED') {
      await this.prisma.clientBudget.updateMany({
        where: { clientId, tenantId, status: 'ACTIVE' },
        data: { spentAmount: { increment: totalAmount } },
      });
    }

    return expense;
  }

  async updateExpense(
    tenantId: string,
    clientId: string,
    expenseId: string,
    dto: Partial<CreateExpenseDto> & { status?: string },
    userId: string,
    locale: string,
  ) {
    const expense = await this.prisma.clientExpense.findFirst({
      where: { id: expenseId, clientId, tenantId },
    });

    if (!expense) {
      throw new NotFoundException(this.i18n.translate('clients.errors.expenseNotFound', {}, locale));
    }

    if (dto.status && dto.status !== expense.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['PAID', 'OVERDUE', 'CANCELLED'],
        PAID: ['CANCELLED'],
        OVERDUE: ['PAID', 'CANCELLED'],
        CANCELLED: [],
      };
      const allowed = allowedTransitions[expense.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          this.i18n.translate('clients.errors.invalidExpenseStatusTransition', {
            from: expense.status,
            to: dto.status,
            allowed: allowed.join(', ') || 'none',
          }, locale),
        );
      }
    }

    const oldTotalAmount = Number(expense.totalAmount);
    const oldStatus = expense.status;

    const amount = dto.amount ?? Number(expense.amount);
    const taxAmount = dto.taxAmount ?? Number(expense.taxAmount);
    const totalAmount = amount + taxAmount;
    const newStatus = dto.status ?? oldStatus;

    const updated = await this.prisma.clientExpense.update({
      where: { id: expenseId },
      data: {
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.referenceNumber !== undefined && { referenceNumber: dto.referenceNumber }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),
        totalAmount,
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    const wasCounted = oldStatus !== 'CANCELLED';
    const isCounted = newStatus !== 'CANCELLED';
    const delta = totalAmount - oldTotalAmount;

    if (wasCounted && isCounted && delta !== 0) {
      await this.prisma.clientBudget.updateMany({
        where: { clientId, tenantId, status: 'ACTIVE' },
        data: { spentAmount: { increment: delta } },
      });
    } else if (!wasCounted && isCounted) {
      await this.prisma.clientBudget.updateMany({
        where: { clientId, tenantId, status: 'ACTIVE' },
        data: { spentAmount: { increment: totalAmount } },
      });
    } else if (wasCounted && !isCounted) {
      await this.prisma.clientBudget.updateMany({
        where: { clientId, tenantId, status: 'ACTIVE' },
        data: { spentAmount: { decrement: oldTotalAmount } },
      });
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CLIENT_EXPENSE_UPDATED',
          module: 'CLIENTS',
          recordId: clientId,
          oldValues: { expenseId, totalAmount: oldTotalAmount, status: oldStatus },
          newValues: { expenseId, totalAmount, status: newStatus },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return updated;
  }

  async getFinancialSummary(tenantId: string, clientId: string, locale: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, isDeleted: false },
    });

    if (!client) {
      throw new NotFoundException(this.i18n.translate('clients.errors.notFound', {}, locale));
    }

    const [
      expenseByType,
      expenseByStatus,
      totalBudget,
      usedBudget,
    ] = await Promise.all([
      this.prisma.clientExpense.groupBy({
        by: ['type'],
        where: { clientId, tenantId, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.clientExpense.groupBy({
        by: ['status'],
        where: { clientId, tenantId },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.clientBudget.aggregate({
        where: { clientId, tenantId, status: 'ACTIVE' },
        _sum: { totalAmount: true },
      }),
      this.prisma.clientBudget.aggregate({
        where: { clientId, tenantId, status: 'ACTIVE' },
        _sum: { spentAmount: true },
      }),
    ]);

    return {
      client: {
        id: client.id,
        name: client.name,
        code: client.code,
        currencyCode: client.currencyCode,
        creditLimit: client.creditLimit,
        openingBalance: client.openingBalance,
      },
      expensesByType: expenseByType.map((e) => ({
        type: e.type,
        totalAmount: Number(e._sum.totalAmount || 0),
        count: e._count,
      })),
      expensesByStatus: expenseByStatus.map((e) => ({
        status: e.status,
        totalAmount: Number(e._sum.totalAmount || 0),
        count: e._count,
      })),
      budget: {
        total: Number(totalBudget._sum.totalAmount || 0),
        used: Number(usedBudget._sum.spentAmount || 0),
        remaining: Number(totalBudget._sum.totalAmount || 0) - Number(usedBudget._sum.spentAmount || 0),
      },
    };
  }
}

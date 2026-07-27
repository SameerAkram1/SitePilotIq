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
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { ClientsService } from './clients.service';
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
import { UserRole } from '@prisma/client';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.FINANCE_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.create(tenantId, dto, userId, locale);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: QueryClientsDto,
  ) {
    return this.clientsService.findAll(tenantId, filters);
  }

  @Get('stats')
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.clientsService.findAll(tenantId, { page: 1, limit: 1 });
  }

  @Get(':id')
  findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.findById(tenantId, id, locale);
  }

  @Get(':id/dashboard')
  getDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.getDashboard(tenantId, id, locale);
  }

  @Get(':id/financial-summary')
  getFinancialSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.getFinancialSummary(tenantId, id, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.update(tenantId, id, dto, userId, locale);
  }

  @Patch(':id/disable')
  @Roles(UserRole.ADMIN)
  disable(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.disable(tenantId, id, userId, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.remove(tenantId, id, userId, locale);
  }

  @Post(':id/contacts')
  addContact(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.addContact(tenantId, id, dto, userId, locale);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.updateContact(tenantId, id, contactId, dto, userId, locale);
  }

  @Delete(':id/contacts/:contactId')
  deleteContact(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.deleteContact(tenantId, id, contactId, userId, locale);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateClientNoteDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.addNote(tenantId, id, dto, userId, locale);
  }

  @Patch(':id/notes/:noteId')
  updateNote(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateClientNoteDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.updateNote(tenantId, id, noteId, dto, userId, locale);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.deleteNote(tenantId, id, noteId, userId, locale);
  }

  @Get(':id/reminders')
  getUpcomingReminders(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.getUpcomingReminders(tenantId, id, locale);
  }

  @Get(':id/budgets')
  getBudgets(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.clientsService.getBudgets(tenantId, id, locale);
  }

  @Post(':id/budgets')
  createBudget(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateBudgetDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.createBudget(tenantId, id, dto, userId, locale);
  }

  @Patch(':id/budgets/:budgetId')
  updateBudget(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('budgetId') budgetId: string,
    @Body() dto: CreateBudgetDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.updateBudget(tenantId, id, budgetId, dto, userId, locale);
  }

  @Get(':id/expenses')
  getExpenses(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Locale() locale?: string,
  ) {
    return this.clientsService.getExpenses(tenantId, id, { page, limit, type, status }, locale!);
  }

  @Post(':id/expenses')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER)
  createExpense(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateExpenseDto,
    @Locale() locale: string,
  ) {
    return this.clientsService.createExpense(tenantId, id, dto, userId, locale);
  }

  @Patch(':id/expenses/:expenseId')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  updateExpense(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: any,
    @Locale() locale: string,
  ) {
    return this.clientsService.updateExpense(tenantId, id, expenseId, dto, userId, locale);
  }
}

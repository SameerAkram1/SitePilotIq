import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { OnboardingDto } from './dto/onboarding.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('validate-invitation')
  async validateInvitation(
    @Query('token') token: string,
    @Locale() locale: string,
  ) {
    const result = await this.usersService.validateInvitation(token);
    return {
      success: result.valid,
      data: result,
      message: result.valid ? 'Invitation is valid' : result.message,
    };
  }

  @Public()
  @Post('accept-invitation')
  async acceptInvitation(
    @Locale() locale: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: AcceptInvitationDto,
  ) {
    const result = await this.usersService.acceptInvitation(dto.token, {
      fullName: dto.fullName,
      password: dto.password,
      phone: dto.phone,
    }, locale);
    return {
      success: true,
      data: result,
      message: 'Account created successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN')
  async getUsers(
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    const result = await this.usersService.getUsers(tenantId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
      status,
      search,
      department,
    });
    return {
      success: true,
      data: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN')
  async getInvitations(
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
  ) {
    const invitations = await this.usersService.getInvitations(tenantId);
    return {
      success: true,
      data: invitations,
      message: 'Invitations retrieved successfully',
    };
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN')
  async inviteUser(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Locale() locale: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: InviteUserDto,
  ) {
    const invitation = await this.usersService.inviteUser(tenantId, dto, userId, locale);
    return {
      success: true,
      data: invitation,
      message: 'Invitation sent successfully',
    };
  }

  @Delete('invitations/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN')
  async revokeInvitation(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    const result = await this.usersService.revokeInvitation(tenantId, id, locale);
    return {
      success: true,
      data: result,
      message: 'Invitation revoked successfully',
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async changePassword(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: ChangePasswordDto,
  ) {
    const result = await this.usersService.changePassword(userId, tenantId, dto, locale);
    return {
      success: true,
      data: result,
      message: 'Password changed successfully',
    };
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async completeOnboarding(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: OnboardingDto,
  ) {
    const result = await this.usersService.completeOnboarding(tenantId, userId, dto, locale);
    return {
      success: true,
      data: result,
      message: 'Onboarding completed successfully',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getUserById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    const user = await this.usersService.getUserById(tenantId, id, locale);
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async updateUser(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
    @Locale() locale: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(tenantId, id, dto, {
      id: userId,
      role: userRole,
    }, locale);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteUser(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    const result = await this.usersService.deleteUser(tenantId, id, userId, locale);
    return {
      success: true,
      data: result,
      message: 'User deleted successfully',
    };
  }
}

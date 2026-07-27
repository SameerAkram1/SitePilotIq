import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { I18nService } from '../i18n/i18n.service';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { UserStatus, UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { generateUserCode } from '../common/utils/code-generator.util';
import { encrypt, maskSensitiveField } from '../common/utils/encryption.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly i18n: I18nService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async getUsers(
    tenantId: string,
    filters: {
      page?: number;
      limit?: number;
      role?: string;
      status?: string;
      search?: string;
      department?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    if (filters.department) where.department = filters.department;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            phone: true,
            profilePhoto: true,
            jobTitle: true,
            department: true,
            code: true,
            joiningDate: true,
            employmentType: true,
            onboardingComplete: true,
            isFirstLogin: true,
            emailVerified: true,
            lastActiveAt: true,
            createdAt: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(tenantId: string, id: string, locale: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        profilePhoto: true,
        jobTitle: true,
        department: true,
        code: true,
        fatherName: true,
        surname: true,
        dateOfBirth: true,
        gender: true,
        joiningDate: true,
        terminationDate: true,
        employmentType: true,
        salaryBasis: true,
        hourlyRate: true,
        dailyRate: true,
        monthlyBaseSalary: true,
        street: true,
        city: true,
        country: true,
        bankName: true,
        bankAccountNumber: true,
        iban: true,
        swiftBic: true,
        notes: true,
        onboardingComplete: true,
        isFirstLogin: true,
        emailVerified: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('users.errors.notFound', {}, locale));
    }

    return user;
  }

  async updateUser(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
    requestingUser: { id: string; role: string },
    locale: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('users.errors.notFound', {}, locale));
    }

    const isAdmin = requestingUser.role === 'ADMIN' || requestingUser.role === 'SUPER_ADMIN';
    const isSelf = requestingUser.id === userId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(this.i18n.translate('users.errors.cannotUpdateOther', {}, locale));
    }

    const adminFields = [
      'role', 'status', 'department', 'jobTitle', 'fatherName', 'surname',
      'ssn', 'passportNumber', 'dateOfBirth', 'gender', 'joiningDate',
      'terminationDate', 'employmentType', 'salaryBasis', 'hourlyRate',
      'dailyRate', 'monthlyBaseSalary', 'street', 'city', 'country',
      'bankName', 'bankAccountNumber', 'iban', 'swiftBic', 'notes',
    ];
    const selfFields = ['fullName', 'phone', 'jobTitle', 'dateOfBirth', 'gender', 'fatherName'];

    const allowedFields = isAdmin ? [...adminFields, ...selfFields] : selfFields;

    if (isSelf && dto.role) {
      throw new ForbiddenException(this.i18n.translate('users.errors.cannotChangeOwnRole', {}, locale));
    }

    if (isSelf && dto.status === 'DISABLED') {
      throw new ForbiddenException(this.i18n.translate('users.errors.cannotDisableSelf', {}, locale));
    }

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        if (key === 'ssn' || key === 'bankAccountNumber' || key === 'iban') {
          updateData[key] = encrypt(dto[key]);
        } else if (key === 'dateOfBirth' || key === 'joiningDate' || key === 'terminationDate') {
          updateData[key] = dto[key] ? new Date(dto[key]) : null;
        } else {
          updateData[key] = dto[key];
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        jobTitle: true,
        department: true,
        code: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUser.id,
        action: isAdmin && dto.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
        module: 'USERS',
        recordId: userId,
        oldValues: { role: user.role, status: user.status },
        newValues: updateData,
        ipAddress: null,
        userAgent: null,
      },
    });

    return updated;
  }

  async completeOnboarding(
    tenantId: string,
    userId: string,
    dto: OnboardingDto,
    locale: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('users.errors.notFound', {}, locale));
    }

    if (user.onboardingComplete) {
      throw new BadRequestException('Onboarding already completed');
    }

    const code = await generateUserCode(this.prisma, tenantId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender || null,
        fatherName: dto.fatherName || null,
        code,
        joiningDate: new Date(),
        onboardingComplete: true,
        isFirstLogin: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        code: true,
        onboardingComplete: true,
      },
    });

    return updated;
  }

  async inviteUser(
    tenantId: string,
    dto: InviteUserDto,
    invitedBy: string,
    locale: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException(this.i18n.translate('users.errors.tenantNotFound', {}, locale));
    }

    const userCount = await this.prisma.user.count({
      where: { tenantId, status: { not: 'DISABLED' } },
    });

    if (userCount >= tenant.maxUsers) {
      throw new ForbiddenException(this.i18n.translate('users.errors.maxUsersReached', { max: tenant.maxUsers }, locale));
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(this.i18n.translate('users.errors.emailExists', {}, locale));
    }

    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
        isRevoked: false,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ConflictException(this.i18n.translate('users.errors.invitationAlreadySent', {}, locale));
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedBy },
      select: { fullName: true },
    });

    const invitation = await this.prisma.userInvitation.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        role: dto.role as UserRole,
        departmentId: dto.departmentId || null,
        invitedById: invitedBy,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await this.emailService.sendInvitationEmail(
      dto.email,
      inviter?.fullName || 'Someone',
      tenant.name,
      dto.role,
      invitation.token,
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: invitedBy,
        action: 'USER_INVITED',
        module: 'USERS',
        recordId: invitation.id,
        newValues: { email: dto.email, role: dto.role },
        ipAddress: null,
        userAgent: null,
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async getInvitations(tenantId: string) {
    return this.prisma.userInvitation.findMany({
      where: {
        tenantId,
        isRevoked: false,
        acceptedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        invitedById: true,
        expiresAt: true,
        acceptedAt: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(tenantId: string, invitationId: string, locale: string) {
    const invitation = await this.prisma.userInvitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException(this.i18n.translate('users.errors.invitationNotFound', {}, locale));
    }

    await this.prisma.userInvitation.update({
      where: { id: invitationId },
      data: { isRevoked: true },
    });

    return { success: true };
  }

  async acceptInvitation(token: string, dto: { fullName: string; password: string; phone?: string }, locale: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true, status: true, isActive: true } } },
    });

    if (!invitation) {
      throw new NotFoundException(this.i18n.translate('users.errors.invalidInvitation', {}, locale));
    }

    if (invitation.isRevoked) {
      throw new BadRequestException(this.i18n.translate('users.errors.invitationRevoked', {}, locale));
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException(this.i18n.translate('users.errors.invitationAccepted', {}, locale));
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(this.i18n.translate('users.errors.invitationExpired', {}, locale));
    }

    if (!invitation.tenant?.isActive || invitation.tenant.status !== 'ACTIVE') {
      throw new BadRequestException(this.i18n.translate('users.errors.companyNotActive', {}, locale));
    }

    const passwordHash = await argon2.hash(dto.password);
    const tenantId = invitation.tenantId!;

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        email: invitation.email,
        passwordHash,
        phone: dto.phone,
        role: invitation.role,
        departmentId: invitation.departmentId || null,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isFirstLogin: true,
        onboardingComplete: false,
        invitedById: invitation.invitedById,
      },
    });

    await this.prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    await this.emailService.sendWelcomeEmail(user.email, user.fullName, invitation.tenant!.name);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'USER_INVITATION_ACCEPTED',
        module: 'USERS',
        recordId: invitation.id,
        ipAddress: null,
        userAgent: null,
      },
    });

    const tokens = await this.generateTokensForUser(user.id, tenantId, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        onboardingComplete: user.onboardingComplete,
        isFirstLogin: true,
      },
    };
  }

  async validateInvitation(token: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true } } },
    });

    if (!invitation || invitation.isRevoked || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      return { valid: false, message: 'Invalid or expired invitation' };
    }

    return {
      valid: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        companyName: invitation.tenant?.name,
      },
    };
  }

  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
    locale: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, passwordHash: true, isFirstLogin: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('users.errors.notFound', {}, locale));
    }

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException(this.i18n.translate('users.errors.currentPasswordIncorrect', {}, locale));
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(this.i18n.translate('users.errors.newPasswordSame', {}, locale));
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isFirstLogin: false,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokensForUser(userId, tenantId, user.role);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'PASSWORD_CHANGED',
        module: 'AUTH',
        ipAddress: null,
        userAgent: null,
      },
    });

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async deleteUser(tenantId: string, userId: string, requestingUserId: string, locale: string) {
    if (userId === requestingUserId) {
      throw new ForbiddenException(this.i18n.translate('users.errors.cannotDeleteSelf', {}, locale));
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('users.errors.notFound', {}, locale));
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DISABLED },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUserId,
        action: 'USER_DELETED',
        module: 'USERS',
        recordId: userId,
        ipAddress: null,
        userAgent: null,
      },
    });

    return { success: true };
  }

  private async generateTokensForUser(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };
    const refreshPayload = { sub: userId, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    const hashedRefreshToken = await argon2.hash(refreshToken);
    const tokenIndex = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        tokenIndex,
        userId,
        tenantId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}

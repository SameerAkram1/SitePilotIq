import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { I18nService } from '../i18n/i18n.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { UserRole, UserStatus, PlanType, TenantStatus } from '@prisma/client';

interface TokenPayload {
  sub: string;
  tenantId: string | null;
  role?: string;
  iss: string;
  aud: string;
  jti: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  isFirstLogin?: boolean;
  onboardingComplete?: boolean;
  requiresVerification?: boolean;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresVerification?: boolean;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/;

// Hash tokens for secure storage (SHA-256 for lookup tokens, argon2 for JWT)
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ISSUER = 'sitepilotiq';
  private readonly JWT_AUDIENCE = 'sitepilotiq-api';
  private lastCleanupAt = 0;
  private static CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

  constructor(
    private readonly i18n: I18nService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new company (tenant) with admin user.
   */
  async register(dto: {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    country?: string;
  }, locale: string): Promise<{ message: string }> {
    // Validate password policy
    if (!PASSWORD_REGEX.test(dto.password)) {
      throw new BadRequestException(this.i18n.translate('auth.errors.passwordRequirements', {}, locale));
    }

    // Generate slug from company name
    const slug = await this.generateUniqueSlug(dto.companyName, locale);

    // Hash password
    const passwordHash = await argon2.hash(dto.password);

    // Generate email verification token (store hash, send raw)
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyTokenHash = hashToken(emailVerifyToken);
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create tenant, settings, subscription, user, and audit log in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          status: TenantStatus.ACTIVE,
          plan: PlanType.FREE_TRIAL,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          maxUsers: 5,
          isActive: true,
        },
      });

      await tx.companySettings.create({
        data: {
          tenantId: tenant.id,
          companyName: dto.companyName,
          country: dto.country || 'US',
          defaultCurrency: 'USD',
          defaultLanguage: 'en',
          timezone: 'UTC',
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: PlanType.FREE_TRIAL,
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          fullName: dto.fullName,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.PENDING,
          emailVerified: false,
          emailVerifyToken: emailVerifyTokenHash,
          emailVerifyExpiry,
          isFirstLogin: true,
          onboardingComplete: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'TENANT_REGISTERED',
          module: 'AUTH',
          ipAddress: null,
          userAgent: null,
        },
      });

      return { tenantId: tenant.id, userId: user.id };
    });

    // Send verification email (outside transaction — non-critical)
    await this.emailService.sendVerificationEmail(dto.email, dto.fullName, emailVerifyToken);

    return { message: 'Check your email to verify your account' };
  }

  /**
   * Verify email address with token.
   * Does NOT generate tokens — user should log in after verification.
   */
  async verifyEmail(token: string, locale: string): Promise<void> {
    const tokenHash = hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: tokenHash,
        emailVerified: false,
      },
      select: {
        id: true,
        tenantId: true,
        emailVerifyExpiry: true,
      },
    });

    if (!user) {
      throw new BadRequestException(this.i18n.translate('auth.errors.invalidVerificationToken', {}, locale));
    }

    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      throw new BadRequestException(this.i18n.translate('auth.errors.verificationExpired', {}, locale));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
          emailVerifyToken: null,
          emailVerifyExpiry: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId!,
          userId: user.id,
          action: 'EMAIL_VERIFIED',
          module: 'AUTH',
          ipAddress: null,
          userAgent: null,
        },
      });
    });
  }

  /**
   * Resend verification email.
   */
  async resendVerification(email: string, locale: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerifyExpiry: true,
      },
    });

    // Always return same message to prevent email enumeration
    const genericMessage = 'If an account with that email exists, a verification link has been sent.';

    if (!user) {
      return { message: genericMessage };
    }

    // Rate limit: check if last verification was sent less than 60 seconds ago
    if (user.emailVerifyExpiry) {
      const lastSent = new Date(user.emailVerifyExpiry.getTime() - 24 * 60 * 60 * 1000);
      const timeSince = Date.now() - lastSent.getTime();
      if (timeSince < 60 * 1000) {
        return { message: genericMessage };
      }
    }

    const newToken = randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newToken);
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: newTokenHash,
        emailVerifyExpiry: newExpiry,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.fullName, newToken);

    return { message: genericMessage };
  }

  /**
   * Validate user credentials without generating tokens.
   */
  async validateUser(
    email: string,
    password: string,
    tenantSlug: string,
    locale: string,
  ): Promise<AuthUser | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        passwordHash: true,
        role: true,
        status: true,
        emailVerified: true,
        isFirstLogin: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.errors.accountLocked', {}, locale),
      );
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginCount);
      return null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      isFirstLogin: user.isFirstLogin,
      requiresVerification: !user.emailVerified,
    };
  }

  /**
   * Validate tenant slug exists and is active.
   * Returns company name for the login UI step 1.
   */
  async validateTenantSlug(slug: string, locale: string): Promise<{ companyName: string; slug: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { name: true, slug: true, isActive: true, status: true },
    });

    if (!tenant || !tenant.isActive || tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.invalidCompanyName', {}, locale));
    }

    return { companyName: tenant.name, slug: tenant.slug };
  }

  /**
   * Check if a slug is available for registration.
   */
  async checkSlugAvailable(slug: string, locale: string): Promise<{ available: boolean }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    return { available: !tenant };
  }

  /**
   * Full login flow.
   */
  async login(
    email: string,
    password: string,
    tenantSlug: string,
    ipAddress?: string,
    userAgent?: string,
    locale?: string,
  ): Promise<LoginResult> {
    // Fire-and-forget cleanup of expired tokens (runs at most once/hour)
    this.cleanupExpiredTokens().catch(() => {});

    const resolvedLocale = locale || 'en';
    const INVALID_CREDENTIALS_MSG = this.i18n.translate('auth.errors.invalidCredentials', {}, resolvedLocale);

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive || tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId: tenant.id,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        passwordHash: true,
        role: true,
        status: true,
        emailVerified: true,
        isFirstLogin: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginCount);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    if (!user.emailVerified) {
      return {
        accessToken: '',
        refreshToken: '',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
        },
        requiresVerification: true,
      };
    }

    const tokens = await this.generateTokens(user.id, tenant.id, user.role);

    const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
    const tokenIndex = hashToken(tokens.refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        tokenIndex,
        userId: user.id,
        tenantId: tenant.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: 'LOGIN',
        module: 'AUTH',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        isFirstLogin: user.isFirstLogin,
      },
    };
  }

  /**
   * Decode refresh token payload.
   */
  async decodeRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string; tenantId: string }> {
    return this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      issuer: this.JWT_ISSUER,
      audience: this.JWT_AUDIENCE,
    });
  }

  /**
   * Refresh access token using refresh token rotation.
   * Includes reuse detection: if a revoked token is reused, revoke ALL sessions.
   */
  async refreshTokens(
    userId: string,
    refreshToken: string,
    locale: string,
  ): Promise<TokenPair> {
    // Fire-and-forget cleanup of expired tokens (runs at most once/hour)
    this.cleanupExpiredTokens().catch(() => {});

    const now = new Date();
    const tokenIndex = hashToken(refreshToken);

    // O(1) lookup via indexed tokenIndex instead of O(n) argon2 scan
    const matchedRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenIndex,
        userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!matchedRecord) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.invalidRefreshToken', {}, locale));
    }

    // Check for token reuse (revoked token being replayed)
    if (matchedRecord.isRevoked) {
      const hasValidSuccessor = await this.prisma.refreshToken.findFirst({
        where: {
          userId,
          isRevoked: false,
          id: { not: matchedRecord.id },
        },
        select: { id: true },
      });

      if (!hasValidSuccessor) {
        this.logger.warn(
          `Refresh token reuse detected for user ${userId} with no valid successor. Revoking all sessions.`,
        );
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException(
          this.i18n.translate('auth.errors.tokenReuseDetected', {}, locale),
        );
      }
    }

    // Reject expired tokens
    if (matchedRecord.expiresAt < now) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.invalidRefreshToken', {}, locale));
    }

    // Revoke the old token
    await this.prisma.refreshToken.update({
      where: { id: matchedRecord.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, role: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.accountNotActive', {}, locale));
    }

    if (!user.tenantId) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.tenantRequired', {}, locale));
    }

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.role,
    );

    const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
    const newTokenIndex = hashToken(tokens.refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        tokenIndex: newTokenIndex,
        userId: user.id,
        tenantId: user.tenantId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: matchedRecord.ipAddress,
        userAgent: matchedRecord.userAgent,
      },
    });

    return tokens;
  }

  /**
   * Logout by revoking refresh token.
   */
  async logout(
    userId: string,
    refreshToken: string,
    locale: string,
  ): Promise<{ success: boolean }> {
    const tokenIndex = hashToken(refreshToken);

    const matchedRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenIndex,
        userId,
        isRevoked: false,
      },
      select: { id: true },
    });

    if (matchedRecord) {
      await this.prisma.refreshToken.update({
        where: { id: matchedRecord.id },
        data: { isRevoked: true },
      });
    }

    return { success: true };
  }

  /**
   * Logout from all devices.
   */
  async logoutAll(userId: string, locale: string): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  /**
   * Clean up expired and revoked refresh tokens (runs at most once per hour).
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanupAt < AuthService.CLEANUP_INTERVAL_MS) return;
    this.lastCleanupAt = now;
    try {
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: sevenDaysAgo } },
            { isRevoked: true, createdAt: { lt: sevenDaysAgo } },
          ],
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/revoked refresh tokens`);
      }
    } catch (err) {
      this.logger.warn('Failed to cleanup expired refresh tokens', err);
    }
  }

  /**
   * Generate access and refresh token pair with hardened JWT.
   */
  async generateTokens(
    userId: string,
    tenantId: string | null,
    role: string,
  ): Promise<TokenPair> {
    const jti = randomBytes(16).toString('hex');

    const payload: TokenPayload = {
      sub: userId,
      tenantId,
      role,
      iss: this.JWT_ISSUER,
      aud: this.JWT_AUDIENCE,
      jti,
    };

    const refreshPayload = {
      sub: userId,
      tenantId,
      iss: this.JWT_ISSUER,
      aud: this.JWT_AUDIENCE,
      jti,
    };

    const jwtAccessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const jwtAccessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const jwtRefreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    if (!jwtAccessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
    }
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not set in environment variables');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtAccessSecret,
        expiresIn: jwtAccessExpiresIn as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: jwtRefreshSecret,
        expiresIn: jwtRefreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Decode an access token without verifying signature (for expiry read only).
   * Only used to extract `exp` for the frontend lifecycle timer.
   */
  decodeAccessToken(token: string): Record<string, unknown> {
    return this.jwtService.decode(token) as Record<string, unknown>;
  }

  /**
   * Get current user profile.
   */
  async getProfile(userId: string, tenantId: string, locale: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        isFirstLogin: true,
        onboardingComplete: true,
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.translate('auth.errors.userNotFound', {}, locale));
    }

    return user;
  }

  /**
   * Request password reset.
   */
  async forgotPassword(email: string, tenantSlug: string, locale: string): Promise<{ message: string }> {
    const genericMessage = 'If an account with that email exists, a reset link has been sent.';

    const where: any = { email: email.toLowerCase() };
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (tenant) {
        where.tenantId = tenant.id;
      }
    }

    const user = await this.prisma.user.findFirst({
      where,
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return { message: genericMessage };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpiry: resetExpiry,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);

    return { message: genericMessage };
  }

  /**
   * Reset password with token.
   */
  async resetPassword(token: string, newPassword: string, locale: string): Promise<{ message: string }> {
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new BadRequestException(this.i18n.translate('auth.errors.passwordRequirements', {}, locale));
    }

    const tokenHash = hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
      },
      select: { id: true, passwordResetExpiry: true },
    });

    if (!user) {
      throw new BadRequestException(this.i18n.translate('auth.errors.invalidResetToken', {}, locale));
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException(this.i18n.translate('auth.errors.resetLinkExpired', {}, locale));
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    return { message: 'Password reset successfully. Please log in.' };
  }

  private async handleFailedLogin(
    userId: string,
    currentCount: number,
  ): Promise<void> {
    const newCount = currentCount + 1;
    const updateData: Record<string, any> = { failedLoginCount: newCount };

    if (newCount >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      this.logger.warn(`Account locked for user ${userId} after 5 failed attempts`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  private async generateUniqueSlug(companyName: string, locale: string): Promise<string> {
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      throw new BadRequestException(this.i18n.translate('auth.errors.invalidCompanyName', {}, locale));
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        this.i18n.translate('auth.errors.companyNameTaken', {}, locale),
      );
    }

    return slug;
  }
}

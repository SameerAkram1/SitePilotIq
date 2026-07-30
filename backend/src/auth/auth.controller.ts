import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import type { Request, Response } from 'express';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Locale() locale: string) {
    const result = await this.authService.register(registerDto, locale);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string, @Locale() locale: string) {
    await this.authService.verifyEmail(token, locale);
    return {
      success: true,
      data: { message: 'Email verified successfully. You can now sign in.' },
      message: 'Email verified successfully',
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string, @Locale() locale: string) {
    const result = await this.authService.resendVerification(email, locale);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('validate-slug')
  async validateSlug(@Body('slug') slug: string, @Locale() locale: string) {
    const result = await this.authService.validateTenantSlug(slug, locale);
    return {
      success: true,
      data: result,
      message: 'Company found',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('check-slug')
  async checkSlug(@Body('slug') slug: string, @Locale() locale: string) {
    const result = await this.authService.checkSlugAvailable(slug, locale);
    return {
      success: true,
      data: result,
      message: result.available ? 'Slug is available' : 'Company name already exists',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Locale() locale: string,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      loginDto.tenantSlug,
      ipAddress,
      userAgent,
      locale,
    );

    if (result.requiresVerification) {
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          user: result.user,
          requiresVerification: true,
        },
        message: 'Please verify your email',
      });
    }

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return res.status(HttpStatus.OK).json({
      success: true,
      data: { user: result.user },
      message: 'Login successful',
    });
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Locale() locale: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        statusCode: 401,
        message: 'No refresh token',
      });
    }

    try {
      const payload = await this.authService.decodeRefreshToken(refreshToken);
      const tokens = await this.authService.refreshTokens(
        payload.sub,
        refreshToken,
        locale,
      );

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      // Decode new access token to extract exp for the frontend lifecycle timer
      let tokenExpiresAt: number | null = null;
      try {
        const decoded = await this.authService.decodeAccessToken(tokens.accessToken);
        tokenExpiresAt = (decoded as any).exp ? (decoded as any).exp * 1000 : null;
      } catch { /* ignore */ }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: { message: 'Tokens refreshed', tokenExpiresAt },
        message: 'Tokens refreshed successfully',
      });
    } catch {
      this.clearTokenCookies(res);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        statusCode: 401,
        message: 'Invalid refresh token',
      });
    }
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Locale() locale: string,
  ) {
    const result = await this.authService.forgotPassword(dto.email, dto.tenantSlug, locale);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
    @Locale() locale: string,
  ) {
    const result = await this.authService.resetPassword(token, password, locale);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Locale() locale: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const payload = await this.authService.decodeRefreshToken(refreshToken);
        await this.authService.logout(payload.sub, refreshToken, locale);
      } catch {
        // Ignore errors during logout
      }
    }

    this.clearTokenCookies(res);

    return res.status(HttpStatus.OK).json({
      success: true,
      data: null,
      message: 'Logged out successfully',
    });
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
    @Locale() locale: string,
  ) {
    await this.authService.logoutAll(userId, locale);
    this.clearTokenCookies(res);
    return {
      success: true,
      data: null,
      message: 'Logged out from all devices',
    };
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('me')
  async getProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Locale() locale: string,
    @Req() req: Request,
  ) {
    const user = await this.authService.getProfile(userId, tenantId, locale);
    const accessToken = req.cookies?.accessToken;
    let tokenExpiresAt: number | null = null;
    if (accessToken) {
      try {
        const payload = await this.authService.decodeAccessToken(accessToken);
        tokenExpiresAt = (payload as any).exp ? (payload as any).exp * 1000 : null;
      } catch {
        // token may already be expired — that's fine
      }
    }
    return {
      success: true,
      data: { ...user, tokenExpiresAt },
      message: 'Profile retrieved successfully',
    };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }
}

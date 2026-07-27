import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { I18nService } from '../../i18n/i18n.service';
import { UserStatus } from '@prisma/client';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
}

function extractJwtFromCookie(req: Request): string | null {
  const token = req.cookies?.accessToken;
  return token || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
    const jwtAccessSecret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!jwtAccessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
    }

    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.accountNotActive', {}, 'en'));
    }

    return user;
  }
}

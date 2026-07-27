import 'reflect-metadata';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { I18nService } from '../../i18n/i18n.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const controllerClass = context.getClass();

    const isPublic =
      this.reflector.get<boolean>(IS_PUBLIC_KEY, handler) ??
      this.reflector.get<boolean>(IS_PUBLIC_KEY, controllerClass) ??
      Reflect.getMetadata(IS_PUBLIC_KEY, handler) ??
      Reflect.getMetadata(IS_PUBLIC_KEY, controllerClass);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const locale = request.locale || 'en';

    if (!user) {
      throw new ForbiddenException(this.i18n.translate('guards.errors.accessDenied', {}, locale));
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException(this.i18n.translate('guards.errors.noTenant', {}, locale));
    }

    request.tenantId = user.tenantId;

    return true;
  }
}

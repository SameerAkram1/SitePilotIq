import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { I18nService } from '../../i18n/i18n.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly i18n: I18nService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      let locale = 'en';
      try {
        const request = context?.switchToHttp?.().getRequest?.();
        if (request?.locale) locale = request.locale;
      } catch {}
      throw new UnauthorizedException(this.i18n.translate('guards.errors.invalidToken', {}, locale));
    }
    return user;
  }
}

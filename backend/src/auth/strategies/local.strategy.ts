import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { I18nService } from '../../i18n/i18n.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    email: string,
    password: string,
  ): Promise<any> {
    const tenantSlug = req.body.tenantSlug;
    const user = await this.authService.validateUser(email, password, tenantSlug, 'en');
    if (!user) {
      throw new UnauthorizedException(this.i18n.translate('auth.errors.invalidCredentials', {}, 'en'));
    }
    return user;
  }
}

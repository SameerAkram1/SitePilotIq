import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SUPPORTED_LOCALES = ['en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'ar', 'tr', 'ru', 'zh', 'hi'];
const DEFAULT_LOCALE = 'en';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const raw = req.headers['x-locale'];
    const locale = typeof raw === 'string' && SUPPORTED_LOCALES.includes(raw) ? raw : DEFAULT_LOCALE;
    req.locale = locale;
    next();
  }
}

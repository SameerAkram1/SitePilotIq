import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private readonly messages: Map<string, Record<string, any>> = new Map();
  private readonly supportedLocales = ['en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'ar', 'tr', 'ru', 'zh', 'hi'];
  private readonly defaultLocale = 'en';
  private readonly localesDir: string;

  constructor() {
    this.localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
    this.loadLocale(this.defaultLocale);
  }

  private loadLocale(locale: string): void {
    try {
      const filePath = path.join(this.localesDir, `${locale}.json`);
      if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        this.messages.set(locale, content);
      } else {
        this.logger.warn(`Locale file not found: ${locale}.json`);
      }
    } catch (error) {
      this.logger.error(`Failed to load locale ${locale}: ${error.message}`);
    }
  }

  translate(key: string, params?: Record<string, string | number>, locale?: string): string {
    const resolvedLocale = locale && this.supportedLocales.includes(locale) ? locale : this.defaultLocale;

    if (!this.messages.has(resolvedLocale)) {
      this.loadLocale(resolvedLocale);
    }

    const messages = this.messages.get(resolvedLocale) || this.messages.get(this.defaultLocale) || {};
    const template = this.resolveKey(messages, key);

    if (template === undefined) {
      this.logger.warn(`Translation key not found: ${key} for locale ${resolvedLocale}`);
      return key;
    }

    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (_, param) => {
      return params[param] !== undefined ? String(params[param]) : `{${param}}`;
    });
  }

  private resolveKey(obj: Record<string, any>, key: string): string | undefined {
    const parts = key.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
  }
}

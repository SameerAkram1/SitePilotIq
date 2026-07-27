import { defineRouting } from 'next-intl/routing';

export const locales = [
  'en', 'sq', 'it', 'es', 'fr', 'de', 'pt', 'ar', 'tr', 'ru', 'zh', 'hi',
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  sq: 'Shqip',
  it: 'Italiano',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  tr: 'Türkçe',
  ru: 'Русский',
  zh: '中文',
  hi: 'हिन्दी',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  sq: '🇦🇱',
  it: '🇮🇹',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
  ar: '🇸🇦',
  tr: '🇹🇷',
  ru: '🇷🇺',
  zh: '🇨🇳',
  hi: '🇮🇳',
};

export const rtlLocales: Locale[] = ['ar'];

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export const defaultLocale: Locale = 'en';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true,
});

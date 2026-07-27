'use client';

import { useEffect } from 'react';
import { isRtlLocale } from '@/i18n/routing';

export function LocaleLayoutClient({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}

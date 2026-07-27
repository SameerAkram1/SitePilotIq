/**
 * Shared construction finance utilities.
 * Single source of truth for unit labels, dimensions, currency formatting.
 */

export const BOQ_UNITS = [
  'm', 'm2', 'm3', 'kg', 'T', 'Nos', 'LS',
  'hr', 'day', 'month', 'set', 'roll', 'lot',
] as const;

export type BoqUnit = (typeof BOQ_UNITS)[number];

/**
 * Human-readable labels for BoQ units.
 * Matches the Prisma BoqUnit enum values.
 */
export const UNIT_LABELS: Record<BoqUnit, string> = {
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  kg: 'kg',
  T: 'T',
  Nos: 'Nos',
  LS: 'Lump Sum',
  hr: 'hr',
  day: 'day',
  month: 'month',
  set: 'set',
  roll: 'roll',
  lot: 'lot',
};

/**
 * Number of dimensions required per unit type.
 * 0 = direct quantity input (Nos, LS, kg, T, etc.)
 * 1 = length only (m)
 * 2 = length × width (m²)
 * 3 = length × width × height (m³)
 */
export const UNIT_DIMENSIONS: Record<BoqUnit, number> = {
  m: 1,
  m2: 2,
  m3: 3,
  kg: 0,
  T: 0,
  Nos: 0,
  LS: 0,
  hr: 0,
  day: 0,
  month: 0,
  set: 0,
  roll: 0,
  lot: 0,
};

/**
 * Currency symbols mapping.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  PKR: 'Rs',
  AED: 'د.إ',
  ALL: 'L',
};

/**
 * Format a number as currency using the site's currency code.
 * Uses Intl.NumberFormat for proper locale-aware formatting.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for invalid currency codes
    const symbol = CURRENCY_SYMBOLS[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format a number with locale-aware thousand separators.
 */
export function formatNumber(value: number, locale: string = 'en-US', decimals: number = 0): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a date for display using the browser's locale.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

/**
 * Format a date range for display.
 */
export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * IPC status display config.
 */
export const IPC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  CERTIFIED: { label: 'Certified', color: 'bg-green-100 text-green-700' },
  PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-700' },
};

/**
 * BoQ unit dimension labels for form fields.
 */
export const DIMENSION_LABELS: Record<number, { label: string; key: string }[]> = {
  1: [{ label: 'Length', key: 'dim1' }],
  2: [
    { label: 'Length', key: 'dim1' },
    { label: 'Width', key: 'dim2' },
  ],
  3: [
    { label: 'Length', key: 'dim1' },
    { label: 'Width', key: 'dim2' },
    { label: 'Height', key: 'dim3' },
  ],
};

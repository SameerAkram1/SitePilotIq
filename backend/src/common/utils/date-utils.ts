/**
 * UTC Date Utilities
 *
 * Convention: All dates are stored as UTC midnight (00:00:00.000Z).
 * When a user picks "June 28" as a date, it is stored as 2026-06-28T00:00:00.000Z
 * regardless of the user's timezone.
 *
 * Frontend displays dates using toLocaleDateString() which auto-converts
 * to the browser's local timezone.
 */

/**
 * A date far in the future used to represent "ongoing" (null endDate).
 */
export const INFINITY_DATE = Object.freeze(new Date('9999-12-31T00:00:00.000Z')) as Date;

/**
 * Get today's date at UTC midnight.
 * Used for "is this assignment active today?" checks.
 */
export function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Parse a date string (YYYY-MM-DD) as UTC midnight.
 * new Date("2026-06-28") in JS creates UTC midnight, which is correct.
 * This function ensures consistency and handles edge cases.
 */
export function parseDateAsUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Normalize any Date to UTC midnight.
 * Strips the time component.
 */
export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Check if two date ranges overlap.
 * Null endDate is treated as infinity (ongoing).
 *
 * Range A: [startA, endA?]  (endA null = ongoing)
 * Range B: [startB, endB?]  (endB null = ongoing)
 *
 * Overlap exists when: startA <= endB AND startB <= endA
 */
export function datesOverlap(
  startA: Date,
  endA: Date | null,
  startB: Date,
  endB: Date | null,
): boolean {
  const effectiveEndA = endA ?? INFINITY_DATE;
  const effectiveEndB = endB ?? INFINITY_DATE;
  return startA <= effectiveEndB && startB <= effectiveEndA;
}

/**
 * Format a date for display in the user's local timezone.
 */
export function formatDateLocal(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

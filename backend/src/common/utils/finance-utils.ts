/**
 * Shared construction finance constants for backend.
 * Single source of truth for unit dimensions, matching the Prisma BoqUnit enum.
 */

import { BoqUnit } from '@prisma/client';

/**
 * Number of dimensions required per unit type.
 * 0 = direct quantity input (Nos, LS, kg, T, etc.)
 * 1 = length only (m)
 * 2 = length × width (m²)
 * 3 = length × width × height (m³)
 */
export const UNIT_DIMENSIONS: Record<BoqUnit, number> = {
  [BoqUnit.m]: 1,
  [BoqUnit.m2]: 2,
  [BoqUnit.m3]: 3,
  [BoqUnit.kg]: 0,
  [BoqUnit.T]: 0,
  [BoqUnit.Nos]: 0,
  [BoqUnit.LS]: 0,
  [BoqUnit.hr]: 0,
  [BoqUnit.day]: 0,
  [BoqUnit.month]: 0,
  [BoqUnit.set]: 0,
  [BoqUnit.roll]: 0,
  [BoqUnit.lot]: 0,
};

/**
 * Calculate total quantity from dimensions based on unit type.
 * Returns null if dimensions are insufficient for the unit type.
 */
export function calculateQuantity(
  unit: BoqUnit,
  dim1?: number | null,
  dim2?: number | null,
  dim3?: number | null,
  directQuantity?: number | null,
): number | null {
  const requiredDims = UNIT_DIMENSIONS[unit];

  if (requiredDims === 0) {
    // Direct quantity units (Nos, LS, kg, T, etc.)
    if (directQuantity != null && directQuantity > 0) {
      return directQuantity;
    }
    return null;
  }

  // Dimensional units
  if (dim1 == null || dim1 <= 0) return null;
  if (requiredDims >= 2 && (dim2 == null || dim2 <= 0)) return null;
  if (requiredDims >= 3 && (dim3 == null || dim3 <= 0)) return null;

  const d2 = requiredDims >= 2 ? dim2! : 1;
  const d3 = requiredDims >= 3 ? dim3! : 1;

  return dim1! * d2 * d3;
}

/**
 * Round a monetary value to 2 decimal places.
 * Uses Math.round to avoid floating-point issues.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

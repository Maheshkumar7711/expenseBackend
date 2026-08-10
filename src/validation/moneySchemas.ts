import { z } from 'zod';

/** Max fractional digits supported by the app (Settings → Decimal Places: 0–3). */
export const MAX_AMOUNT_DECIMAL_PLACES = 3;

function hasAtMostDecimalPlaces(value: number, places: number): boolean {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

const atMostThreeDecimals = {
  message: `Amount supports at most ${MAX_AMOUNT_DECIMAL_PLACES} decimal places`,
} as const;

/**
 * Money amount for API write payloads.
 * Finite, positive, and at most 3 digits after the decimal (DB: numeric(18, 3)).
 */
export const moneyAmountSchema = z
  .number()
  .finite()
  .positive()
  .refine((value) => hasAtMostDecimalPlaces(value, MAX_AMOUNT_DECIMAL_PLACES), atMostThreeDecimals);

/**
 * Non-negative money (saved amounts, foreign amounts that may be 0).
 */
export const moneyAmountNonNegativeSchema = z
  .number()
  .finite()
  .min(0)
  .refine((value) => hasAtMostDecimalPlaces(value, MAX_AMOUNT_DECIMAL_PLACES), atMostThreeDecimals);

/**
 * Any finite money value with ≤3 decimals (e.g. opening balance).
 */
export const moneyAmountFiniteSchema = z
  .number()
  .finite()
  .refine((value) => hasAtMostDecimalPlaces(value, MAX_AMOUNT_DECIMAL_PLACES), atMostThreeDecimals);

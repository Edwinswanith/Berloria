import { ceilToWholeUnit, convert } from "./money";
import type { Money, RateTable } from "./money";

export const MAX_GST_RATE = 0.5;

function assertGstRate(rate: number): void {
  if (!(rate >= 0 && rate <= MAX_GST_RATE)) throw new Error(`GST rate must be between 0 and ${MAX_GST_RATE}, got ${rate}`);
}

export interface PriceOptions {
  /** The seller's price already includes GST (the usual case for a seller in the customer's own country). */
  taxInclusive?: boolean;
}

/**
 * Price the customer sees for one unit, GST-inclusive.
 * Tax-exclusive seller price: seller price → customer currency → whole unit → + GST → whole unit.
 * Tax-inclusive seller price: seller price → customer currency (→ whole unit only if converted).
 */
export function customerUnitPrice(
  sellerPrice: Money,
  currency: string,
  gstRate: number,
  rates: RateTable,
  options: PriceOptions = {},
): Money {
  assertGstRate(gstRate);
  const converted = convert(sellerPrice.amount, sellerPrice.currency, currency, rates);
  // A same-currency price is exactly what the seller typed; only converted prices need tidying.
  const base = sellerPrice.currency === currency ? converted : ceilToWholeUnit(converted, currency);
  if (options.taxInclusive) return { amount: base, currency };
  // Round first to remove float noise (e.g. 117500 * 1.12) before rounding up.
  const withGst = ceilToWholeUnit(Math.round(ceilToWholeUnit(base, currency) * (1 + gstRate)), currency);
  return { amount: withGst, currency };
}

export interface GstBreakdown {
  taxable: number;
  gst: number;
}

/** Split a GST-inclusive amount into taxable value and GST. Always sums back to `inclusive`. */
export function gstBreakdown(inclusive: number, gstRate: number): GstBreakdown {
  assertGstRate(gstRate);
  const taxable = Math.round(inclusive / (1 + gstRate));
  return { taxable, gst: inclusive - taxable };
}

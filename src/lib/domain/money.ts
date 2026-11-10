import { currencyInfo } from "@/lib/config/currencies";

/** An amount in integer minor units (paise, fen) plus its currency. */
export interface Money {
  amount: number;
  currency: string;
}

/** rates[from][to] = how many `to` major units one `from` major unit buys. */
export type RateTable = Readonly<Record<string, Readonly<Record<string, number>>>>;

function assertMinorUnits(amount: number): void {
  if (!Number.isInteger(amount)) throw new Error(`Amount must be an integer in minor units, got ${amount}`);
}

export function getRate(from: string, to: string, rates: RateTable): number {
  if (from === to) return 1;
  const direct = rates[from]?.[to];
  if (direct) return direct;
  const inverse = rates[to]?.[from];
  if (inverse) return 1 / inverse;
  throw new Error(`No exchange rate for ${from} → ${to}`);
}

export function convert(amount: number, from: string, to: string, rates: RateTable): number {
  assertMinorUnits(amount);
  if (from === to) return amount;
  const scale = 10 ** (currencyInfo(to).decimals - currencyInfo(from).decimals);
  return Math.round(amount * getRate(from, to, rates) * scale);
}

/** Round up to the next whole major unit, for clean customer-facing prices. */
export function ceilToWholeUnit(amount: number, currency: string): number {
  assertMinorUnits(amount);
  const unit = 10 ** currencyInfo(currency).decimals;
  return Math.ceil(amount / unit) * unit;
}

export function formatMoney(amount: number, currency: string): string {
  const info = currencyInfo(currency);
  const unit = 10 ** info.decimals;
  const fraction = amount % unit === 0 ? 0 : info.decimals;
  const number = new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(amount / unit);
  return `${info.symbol}${number}`;
}

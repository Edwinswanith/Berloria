export interface CurrencyInfo {
  code: string;
  symbol: string;
  /** Number of minor-unit digits (paise, fen, cents). */
  decimals: number;
  locale: string;
}

export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", decimals: 2, locale: "en-IN" },
  CNY: { code: "CNY", symbol: "¥", decimals: 2, locale: "en-US" },
  USD: { code: "USD", symbol: "$", decimals: 2, locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", decimals: 2, locale: "en-IE" },
  GBP: { code: "GBP", symbol: "£", decimals: 2, locale: "en-GB" },
  AED: { code: "AED", symbol: "AED ", decimals: 2, locale: "en-AE" },
  JPY: { code: "JPY", symbol: "¥", decimals: 0, locale: "ja-JP" },
} as const satisfies Record<string, CurrencyInfo>;

export type CurrencyCode = keyof typeof CURRENCIES;

export function currencyInfo(code: string): CurrencyInfo {
  const info = (CURRENCIES as Record<string, CurrencyInfo>)[code];
  if (!info) throw new Error(`Unsupported currency: ${code}`);
  return info;
}

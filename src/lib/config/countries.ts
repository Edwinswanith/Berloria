import type { CurrencyCode } from "./currencies";

export interface CountryConfig {
  code: string;
  name: string;
  currency: CurrencyCode;
  /** Customers in this country can buy. */
  sellTo: boolean;
  /** Vendors based in this country can onboard. */
  vendorsFrom: boolean;
}

/**
 * Countries the business operates in. v1: customers in India, vendors in China.
 * Enabling a country is a config change here. Add the rest of the 22 as they are confirmed.
 */
export const COUNTRIES: readonly CountryConfig[] = [
  { code: "IN", name: "India", currency: "INR", sellTo: true, vendorsFrom: false },
  { code: "CN", name: "China", currency: "CNY", sellTo: false, vendorsFrom: true },
  { code: "US", name: "United States", currency: "USD", sellTo: false, vendorsFrom: false },
  { code: "GB", name: "United Kingdom", currency: "GBP", sellTo: false, vendorsFrom: false },
  { code: "AE", name: "United Arab Emirates", currency: "AED", sellTo: false, vendorsFrom: false },
  { code: "JP", name: "Japan", currency: "JPY", sellTo: false, vendorsFrom: false },
  { code: "DE", name: "Germany", currency: "EUR", sellTo: false, vendorsFrom: false },
];

export function getCountry(code: string): CountryConfig {
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) throw new Error(`Unknown country: ${code}`);
  return country;
}

export const SELL_TO_COUNTRIES = COUNTRIES.filter((c) => c.sellTo);
export const VENDOR_COUNTRIES = COUNTRIES.filter((c) => c.vendorsFrom);
export const DEFAULT_CUSTOMER_COUNTRY = "IN";

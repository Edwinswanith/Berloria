/** Catalogue constants and pure helpers, safe to use in client and server code. */
export const CATEGORIES = ["Dresses", "Kurtas & Sets", "Co-ords", "Sarees"] as const;
export type Category = (typeof CATEGORIES)[number];

export const categorySlug = (c: string): string => c.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-");
export const categoryFromSlug = (slug: string): Category | undefined => CATEGORIES.find((c) => categorySlug(c) === slug);

export const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
export type SortKey = keyof typeof SORTS;

export const parseSort = (value: unknown): SortKey =>
  typeof value === "string" && value in SORTS ? (value as SortKey) : "featured";

/** Total units at or below this count as "only a few left". */
export const LOW_STOCK_THRESHOLD = 3;

interface Sortable {
  priceFrom: number;
  createdAt: number;
  featured: boolean;
}

/** Returns a new sorted array; ties keep their original order. */
export function sortCards<T extends Sortable>(cards: readonly T[], sort: SortKey): T[] {
  const compare: Record<SortKey, (a: T, b: T) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured),
    newest: (a, b) => b.createdAt - a.createdAt,
    "price-asc": (a, b) => a.priceFrom - b.priceFrom,
    "price-desc": (a, b) => b.priceFrom - a.priceFrom,
  };
  return [...cards].sort(compare[sort]);
}

export function stockSignal(totalStock: number): "sold_out" | "low" | "in_stock" {
  if (totalStock <= 0) return "sold_out";
  return totalStock <= LOW_STOCK_THRESHOLD ? "low" : "in_stock";
}

/* ------------------------------ search and filters ------------------------------ */

export const SIZE_FILTERS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** Price bands in paise. `max` is exclusive; the last band is open-ended. */
export const PRICE_BANDS = {
  "under-2000": { label: "Under ₹2,000", min: 0, max: 200_000 },
  "2000-3000": { label: "₹2,000 – ₹3,000", min: 200_000, max: 300_000 },
  "3000-4000": { label: "₹3,000 – ₹4,000", min: 300_000, max: 400_000 },
  "over-4000": { label: "Over ₹4,000", min: 400_000, max: Number.POSITIVE_INFINITY },
} as const;
export type PriceBand = keyof typeof PRICE_BANDS;

export interface ShopFilters {
  q?: string;
  size?: string;
  price?: PriceBand;
}

const MAX_QUERY = 60;

export const parseQuery = (value: unknown): string | undefined => {
  const q = typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY) : "";
  return q || undefined;
};
export const parseSize = (value: unknown): string | undefined =>
  typeof value === "string" && (SIZE_FILTERS as readonly string[]).includes(value.toUpperCase()) ? value.toUpperCase() : undefined;
export const parsePriceBand = (value: unknown): PriceBand | undefined =>
  typeof value === "string" && value in PRICE_BANDS ? (value as PriceBand) : undefined;

interface Filterable {
  keywords: string;
  sizes: readonly string[];
  priceFrom: number;
}

/** Every word typed must appear somewhere in the name, category, fabric or description. */
export function filterCards<T extends Filterable>(cards: readonly T[], filters: ShopFilters): T[] {
  const words = (filters.q ?? "").toLowerCase().split(" ").filter(Boolean);
  const band = filters.price ? PRICE_BANDS[filters.price] : null;
  return cards.filter(
    (card) =>
      words.every((w) => card.keywords.includes(w)) &&
      (!filters.size || card.sizes.includes(filters.size)) &&
      (!band || (card.priceFrom >= band.min && card.priceFrom < band.max)),
  );
}

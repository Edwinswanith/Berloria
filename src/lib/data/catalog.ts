import "server-only";
import { connection } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { ExchangeRate, Product, Vendor } from "@/lib/db/models";
import type { RateTable } from "@/lib/domain/money";
import { customerUnitPrice } from "@/lib/domain/pricing";
import { DEFAULT_CUSTOMER_COUNTRY, getCountry } from "@/lib/config/countries";
import { CATEGORIES, filterCards, sortCards, stockSignal, type ShopFilters, type SortKey } from "./catalog-shared";

export { CATEGORIES, categorySlug, categoryFromSlug } from "./catalog-shared";

interface ImageView {
  url: string;
  alt: string;
}

/** Plain, serialisable shapes handed to UI components. */
export interface ProductCard {
  slug: string;
  title: string;
  summary: string;
  category: string;
  edition: string;
  image: ImageView;
  hoverImage: ImageView | null;
  vendorName: string;
  vendorSlug: string;
  vendorCity: string;
  priceFrom: number;
  hasRange: boolean;
  stock: "sold_out" | "low" | "in_stock";
  totalStock: number;
  /** Sizes that can be bought right now. */
  sizes: string[];
  /** Lower-cased text used by shop search. */
  keywords: string;
  featured: boolean;
  createdAt: number;
  currency: string;
}

export interface ProductVariantView {
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
}

export interface ProductDetail extends ProductCard {
  description: string;
  story: string;
  materials: string[];
  gstRate: number;
  images: ImageView[];
  /** At least one gallery image came from the AI photo studio (shown as a note to customers). */
  hasAiImages: boolean;
  options: { name: string; values: string[] }[];
  variants: ProductVariantView[];
  vendorStory: string;
  eta: { minDays: number; maxDays: number } | null;
}

export interface CategoryCover {
  name: string;
  count: number;
  image: ImageView | null;
}

export interface ListOptions {
  category?: string;
  vendorSlug?: string;
  featured?: boolean;
  sort?: SortKey;
  filters?: ShopFilters;
  limit?: number;
  excludeSlug?: string;
}

interface LeanVendor {
  _id: unknown;
  slug: string;
  businessName: string;
  city?: string | null;
  story?: string | null;
  handlingDays: number;
  pricesIncludeTax?: boolean | null;
  shippingLanes: { destination: string; minDays: number; maxDays: number }[];
}

const customerCurrency = () => getCountry(DEFAULT_CUSTOMER_COUNTRY).currency;

async function ready(): Promise<void> {
  // Catalogue reads hit the database at request time, so builds never need a live DB.
  await connection();
  await connectDb();
}

async function loadRates(): Promise<RateTable> {
  const rows = await ExchangeRate.find().lean();
  return rows.reduce<Record<string, Record<string, number>>>(
    (table, r) => ({ ...table, [r.base]: { ...(table[r.base] ?? {}), [r.quote]: r.rate } }),
    {},
  );
}

async function approvedVendors(): Promise<Map<string, LeanVendor>> {
  const vendors = await Vendor.find({ status: "approved" }).lean<LeanVendor[]>();
  return new Map(vendors.map((v) => [String(v._id), v]));
}

function variantsOf(p: { variants: { sku: string; options?: unknown; price: number; stock: number; active?: boolean | null }[] }) {
  return p.variants
    .filter((v) => v.active !== false)
    .map((v) => ({
      sku: v.sku,
      options: (v.options instanceof Map ? Object.fromEntries(v.options) : (v.options ?? {})) as Record<string, string>,
      price: v.price,
      stock: v.stock,
    }));
}

type LeanProduct = Awaited<ReturnType<typeof findActive>>[number];

function findActive(filter: Record<string, unknown>, vendorIds: string[]) {
  return Product.find({ ...filter, status: "active", vendorId: { $in: vendorIds } })
    .sort({ featured: -1, createdAt: -1, _id: 1 })
    .lean();
}

function priceOf(amount: number, p: LeanProduct, vendor: LeanVendor, rates: RateTable): number {
  return customerUnitPrice({ amount, currency: p.currency }, customerCurrency(), p.gstRate, rates, {
    taxInclusive: Boolean(vendor.pricesIncludeTax),
  }).amount;
}

function toCard(p: LeanProduct, vendor: LeanVendor, rates: RateTable): ProductCard {
  const currency = customerCurrency();
  const variants = variantsOf(p);
  const prices = variants.map((v) => priceOf(v.price, p, vendor, rates));
  const totalStock = variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  return {
    slug: p.slug,
    title: p.title,
    summary: p.summary ?? "",
    category: p.category,
    edition: p.edition ?? "",
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : { url: "/products/placeholder.svg", alt: p.title },
    hoverImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt } : null,
    vendorName: vendor.businessName,
    vendorSlug: vendor.slug,
    vendorCity: vendor.city ?? "",
    priceFrom: Math.min(...prices),
    hasRange: new Set(prices).size > 1,
    stock: stockSignal(totalStock),
    sizes: [...new Set(variants.filter((v) => v.stock > 0).flatMap((v) => (v.options.Size ? [v.options.Size] : [])))],
    keywords: [p.title, p.category, p.summary ?? "", ...(p.materials ?? []), ...(p.tags ?? [])].join(" ").toLowerCase(),
    totalStock,
    featured: Boolean(p.featured),
    createdAt: new Date(p.createdAt ?? 0).getTime(),
    currency,
  };
}

export async function listProducts(opts: ListOptions = {}): Promise<ProductCard[]> {
  await ready();
  const [rates, vendors] = await Promise.all([loadRates(), approvedVendors()]);
  const vendorIds = [...vendors.entries()]
    .filter(([, v]) => !opts.vendorSlug || v.slug === opts.vendorSlug)
    .map(([id]) => id);
  const filter = {
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.featured ? { featured: true } : {}),
    ...(opts.excludeSlug ? { slug: { $ne: opts.excludeSlug } } : {}),
  };
  const products = await findActive(filter, vendorIds);
  const cards = products.map((p) => toCard(p, vendors.get(String(p.vendorId))!, rates));
  return sortCards(filterCards(cards, opts.filters ?? {}), opts.sort ?? "featured").slice(0, opts.limit ?? 100);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  await ready();
  const [rates, vendors] = await Promise.all([loadRates(), approvedVendors()]);
  const [p] = await findActive({ slug }, [...vendors.keys()]).limit(1);
  if (!p) return null;

  const vendor = vendors.get(String(p.vendorId))!;
  const variants = variantsOf(p).map((v) => ({ ...v, price: priceOf(v.price, p, vendor, rates) }));
  const lane = vendor.shippingLanes.find((l) => l.destination === DEFAULT_CUSTOMER_COUNTRY);

  return {
    ...toCard(p, vendor, rates),
    description: p.description ?? "",
    story: p.story ?? "",
    materials: p.materials ?? [],
    gstRate: p.gstRate,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    hasAiImages: p.images.some((i) => i.ai),
    options: (p.options ?? []).map((o) => ({ name: o.name ?? "", values: o.values ?? [] })),
    variants,
    vendorStory: vendor.story ?? "",
    eta: lane ? { minDays: vendor.handlingDays + lane.minDays, maxDays: vendor.handlingDays + lane.maxDays } : null,
  };
}

/** Lightweight lookup for page titles. */
export async function getProductTitle(slug: string): Promise<{ title: string; summary: string } | null> {
  await ready();
  const p = await Product.findOne({ slug, status: "active" }, { title: 1, summary: 1 }).lean();
  return p ? { title: p.title, summary: p.summary ?? "" } : null;
}

export async function listCategoryCovers(): Promise<CategoryCover[]> {
  const products = await listProducts();
  return CATEGORIES.map((name) => {
    const inCategory = products.filter((p) => p.category === name);
    const pick = inCategory.at(-1) ?? inCategory[0];
    return { name, count: inCategory.length, image: pick?.image ?? null };
  });
}

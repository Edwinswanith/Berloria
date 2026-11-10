import "server-only";
import { connectDb } from "@/lib/db/connect";
import { Product, Vendor } from "@/lib/db/models";
import { STORE } from "@/lib/config/store";
import { priceBag, type BagItem, type BagLineInput, type PricedBag } from "@/lib/domain/bag";

export interface BagQuote extends PricedBag {
  /** Items that are no longer sold at all; the browser drops them. */
  missing: string[];
  delivery: { minDays: number; maxDays: number };
  freeDeliveryFrom: number;
  storeId: string | null;
}

interface LeanVariant {
  sku: string;
  price: number;
  stock: number;
  options?: Map<string, string> | Record<string, string>;
}

const labelOf = (v: LeanVariant): string =>
  Object.values(v.options instanceof Map ? Object.fromEntries(v.options) : (v.options ?? {})).join(" / ");

/** Looks up every item fresh: current price, current stock, current delivery fee. */
export async function quoteBag(items: readonly BagItem[]): Promise<BagQuote> {
  await connectDb();
  const skus = items.map((i) => i.sku);
  const [products, store] = await Promise.all([
    skus.length ? Product.find({ status: "active", "variants.sku": { $in: skus } }).lean() : [],
    Vendor.findOne({}, { shippingLanes: 1, handlingDays: 1 }).lean(),
  ]);

  const inputs: BagLineInput[] = [];
  const missing: string[] = [];
  for (const item of items) {
    const product = products.find((p) => p.variants.some((v) => v.sku === item.sku));
    const variant = product?.variants.find((v) => v.sku === item.sku) as LeanVariant | undefined;
    if (!product || !variant) {
      missing.push(item.sku);
      continue;
    }
    inputs.push({
      sku: variant.sku, productId: String(product._id), slug: product.slug, title: product.title, variantLabel: labelOf(variant),
      image: product.images[0]?.url ?? "/products/placeholder.svg", unitPrice: variant.price, gstRate: product.gstRate,
      requested: item.qty, stock: variant.stock,
    });
  }

  const lane = store?.shippingLanes?.find((l) => l.destination === "IN") ?? store?.shippingLanes?.[0];
  const handling = store?.handlingDays ?? 1;
  const priced = priceBag(inputs, { fee: lane?.fee ?? STORE.fallbackDeliveryFee, freeFrom: STORE.freeDeliveryFrom });
  return {
    ...priced,
    hasIssues: priced.hasIssues || missing.length > 0,
    missing,
    delivery: { minDays: (lane?.minDays ?? 2) + handling, maxDays: (lane?.maxDays ?? 5) + handling },
    freeDeliveryFrom: STORE.freeDeliveryFrom,
    storeId: store ? String(store._id) : null,
  };
}

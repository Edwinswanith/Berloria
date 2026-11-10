import { gstBreakdown } from "./pricing";

/** What the browser remembers: which size of which product, and how many. Prices never come from the browser. */
export interface BagItem {
  sku: string;
  qty: number;
}

export const MAX_PER_LINE = 10;
export const MAX_LINES = 30;

const clampQty = (qty: number, max = MAX_PER_LINE): number => Math.max(1, Math.min(Math.floor(qty), max));

/** Accept only well-formed items from storage or a request body. */
export function sanitizeItems(raw: unknown): BagItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { sku, qty } = entry as Record<string, unknown>;
    if (typeof sku !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/.test(sku)) continue;
    if (typeof qty !== "number" || !Number.isFinite(qty) || qty < 1) continue;
    merged.set(sku, clampQty((merged.get(sku) ?? 0) + qty));
  }
  return [...merged].slice(0, MAX_LINES).map(([sku, qty]) => ({ sku, qty }));
}

export function addItem(items: readonly BagItem[], sku: string, qty: number, stock: number = MAX_PER_LINE): BagItem[] {
  const limit = Math.min(MAX_PER_LINE, Math.max(1, stock));
  const existing = items.find((i) => i.sku === sku);
  if (existing) return items.map((i) => (i.sku === sku ? { ...i, qty: clampQty(i.qty + qty, limit) } : i));
  return [...items, { sku, qty: clampQty(qty, limit) }];
}

export function setItemQty(items: readonly BagItem[], sku: string, qty: number): BagItem[] {
  if (qty < 1) return removeItem(items, sku);
  return items.map((i) => (i.sku === sku ? { ...i, qty: clampQty(qty) } : i));
}

export const removeItem = (items: readonly BagItem[], sku: string): BagItem[] => items.filter((i) => i.sku !== sku);
export const countItems = (items: readonly BagItem[]): number => items.reduce((sum, i) => sum + i.qty, 0);

/* ------------------------------ pricing ------------------------------ */

export interface BagLineInput {
  sku: string;
  productId: string;
  slug: string;
  title: string;
  variantLabel: string;
  image: string;
  /** GST-inclusive price per piece, in paise. */
  unitPrice: number;
  gstRate: number;
  requested: number;
  stock: number;
}

export type LineIssue = "sold_out" | "reduced";

export interface PricedBagLine extends Omit<BagLineInput, "requested"> {
  quantity: number;
  lineTotal: number;
  gst: number;
  issue?: LineIssue;
}

export interface DeliveryRule {
  /** Flat fee in paise. */
  fee: number;
  /** Orders at or above this subtotal (paise) ship free. */
  freeFrom: number;
}

export interface PricedBag {
  lines: PricedBagLine[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  /** GST already included in the subtotal. */
  gst: number;
  total: number;
  /** True when a line was sold out or its quantity had to be lowered: the customer must look again. */
  hasIssues: boolean;
  /** Paise still needed for free delivery; 0 once it applies. */
  freeDeliveryGap: number;
}

/** Totals for a bag. Quantities are capped by live stock; sold-out lines stay visible but cost nothing. */
export function priceBag(inputs: readonly BagLineInput[], delivery: DeliveryRule): PricedBag {
  const lines = inputs.map((input): PricedBagLine => {
    const { requested, ...line } = input;
    const quantity = Math.max(0, Math.min(requested, line.stock, MAX_PER_LINE));
    const lineTotal = line.unitPrice * quantity;
    const issue: LineIssue | undefined = quantity === 0 ? "sold_out" : quantity < requested ? "reduced" : undefined;
    return { ...line, quantity, lineTotal, gst: gstBreakdown(lineTotal, line.gstRate).gst, ...(issue ? { issue } : {}) };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const shipping = itemCount === 0 || subtotal >= delivery.freeFrom ? 0 : delivery.fee;
  return {
    lines,
    itemCount,
    subtotal,
    shipping,
    gst: lines.reduce((sum, l) => sum + l.gst, 0),
    total: subtotal + shipping,
    hasIssues: lines.some((l) => l.issue),
    freeDeliveryGap: itemCount === 0 ? 0 : Math.max(0, delivery.freeFrom - subtotal),
  };
}

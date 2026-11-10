import { ceilToWholeUnit, convert } from "./money";
import type { Money, RateTable } from "./money";
import { customerUnitPrice, gstBreakdown } from "./pricing";

export interface ShippingLane {
  destination: string;
  /** Flat fee per shipment, in the vendor's currency (minor units). */
  fee: number;
  minDays: number;
  maxDays: number;
}

export interface VendorShippingInfo {
  id: string;
  name: string;
  country: string;
  currency: string;
  handlingDays: number;
  /** Seller's listed prices already include GST. */
  pricesIncludeTax?: boolean;
  lanes: readonly ShippingLane[];
}

export interface CartLineInput {
  productId: string;
  sku: string;
  title: string;
  vendorId: string;
  /** Vendor's price in the vendor's currency. */
  unitPrice: Money;
  gstRate: number;
  quantity: number;
  stock: number;
}

export interface PricedLine extends CartLineInput {
  customerUnitPrice: number;
  lineTotal: number;
  gst: number;
}

export interface Eta {
  minDays: number;
  maxDays: number;
}

export interface ShipmentDraft {
  vendorId: string;
  vendorName: string;
  origin: string;
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  vendorPayout: Money;
  eta: Eta;
}

export interface CartSplit {
  currency: string;
  shipments: ShipmentDraft[];
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  eta: Eta;
}

export interface SplitOptions {
  destination: string;
  currency: string;
  rates: RateTable;
}

function validateLine(line: CartLineInput): void {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error(`Invalid quantity for ${line.sku}: ${line.quantity}`);
  }
  if (line.quantity > line.stock) {
    throw new Error(`Only ${line.stock} in stock for ${line.title} (${line.sku})`);
  }
}

function priceLine(line: CartLineInput, opts: SplitOptions, taxInclusive: boolean): PricedLine {
  const unit = customerUnitPrice(line.unitPrice, opts.currency, line.gstRate, opts.rates, { taxInclusive }).amount;
  const lineTotal = unit * line.quantity;
  return { ...line, customerUnitPrice: unit, lineTotal, gst: gstBreakdown(lineTotal, line.gstRate).gst };
}

function buildShipment(vendor: VendorShippingInfo, lines: CartLineInput[], opts: SplitOptions): ShipmentDraft {
  const lane = vendor.lanes.find((l) => l.destination === opts.destination);
  if (!lane) throw new Error(`${vendor.name} does not ship to ${opts.destination}`);

  const mismatched = lines.find((l) => l.unitPrice.currency !== vendor.currency);
  if (mismatched) throw new Error(`${mismatched.sku} is not priced in ${vendor.currency}`);

  const priced = lines.map((l) => priceLine(l, opts, Boolean(vendor.pricesIncludeTax)));
  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = ceilToWholeUnit(convert(lane.fee, vendor.currency, opts.currency, opts.rates), opts.currency);
  const goodsPayout = lines.reduce((sum, l) => sum + l.unitPrice.amount * l.quantity, 0);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    origin: vendor.country,
    lines: priced,
    subtotal,
    shipping,
    gst: priced.reduce((sum, l) => sum + l.gst, 0),
    total: subtotal + shipping,
    vendorPayout: { amount: goodsPayout + lane.fee, currency: vendor.currency },
    eta: { minDays: vendor.handlingDays + lane.minDays, maxDays: vendor.handlingDays + lane.maxDays },
  };
}

function groupByVendor(lines: readonly CartLineInput[]): Map<string, CartLineInput[]> {
  return lines.reduce((groups, line) => {
    groups.set(line.vendorId, [...(groups.get(line.vendorId) ?? []), line]);
    return groups;
  }, new Map<string, CartLineInput[]>());
}

/**
 * Split a cart into one shipment per vendor, priced in the customer's currency,
 * with the vendor payout in the vendor's currency and a delivery estimate per shipment.
 */
export function splitCart(
  lines: readonly CartLineInput[],
  vendors: Readonly<Record<string, VendorShippingInfo>>,
  opts: SplitOptions,
): CartSplit {
  if (lines.length === 0) throw new Error("Cart is empty");
  lines.forEach(validateLine);

  const shipments = [...groupByVendor(lines)].map(([vendorId, vendorLines]) => {
    const vendor = vendors[vendorId];
    if (!vendor) throw new Error(`Unknown vendor: ${vendorId}`);
    return buildShipment(vendor, vendorLines, opts);
  });

  const sum = (key: "subtotal" | "shipping" | "gst" | "total") => shipments.reduce((s, sh) => s + sh[key], 0);

  return {
    currency: opts.currency,
    shipments,
    subtotal: sum("subtotal"),
    shipping: sum("shipping"),
    gst: sum("gst"),
    total: sum("total"),
    eta: {
      minDays: Math.max(...shipments.map((s) => s.eta.minDays)),
      maxDays: Math.max(...shipments.map((s) => s.eta.maxDays)),
    },
  };
}

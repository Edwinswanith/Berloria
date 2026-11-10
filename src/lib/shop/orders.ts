import "server-only";
import { randomBytes } from "node:crypto";
import { connection } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { Counter, Order, Product, Shipment } from "@/lib/db/models";
import { BRAND } from "@/lib/config/brand";
import { STORE } from "@/lib/config/store";
import { logError } from "@/lib/log";
import type { CheckoutInput } from "./checkout-input";
import { quoteBag, type BagQuote } from "./quote";
import { createPaymentOrder, razorpayKeys, verifyPaymentSignature } from "./razorpay";

export type CheckoutErrorCode = "bag_changed" | "total_changed" | "payment_unavailable" | "cod_unavailable" | "not_found" | "payment_invalid";

/** A problem the shopper can act on. `quote` carries the fresh bag when it changed under them. */
export class CheckoutError extends Error {
  constructor(readonly code: CheckoutErrorCode, message: string, readonly quote?: BagQuote) {
    super(message);
  }
}

export interface StockLine {
  productId: string;
  sku: string;
  quantity: number;
}

/** Takes stock for every line, or none at all. Each update only succeeds if enough is left. */
async function reserveStock(lines: readonly StockLine[]): Promise<boolean> {
  const taken: StockLine[] = [];
  for (const line of lines) {
    const result = await Product.updateOne(
      { _id: line.productId, variants: { $elemMatch: { sku: line.sku, stock: { $gte: line.quantity } } } },
      { $inc: { "variants.$.stock": -line.quantity } },
    );
    if (result.modifiedCount !== 1) {
      await releaseStock(taken);
      return false;
    }
    taken.push(line);
  }
  return true;
}

export async function releaseStock(lines: readonly StockLine[]): Promise<void> {
  await Promise.all(
    lines.map((line) => Product.updateOne({ _id: line.productId, "variants.sku": line.sku }, { $inc: { "variants.$.stock": line.quantity } })),
  );
}

async function nextOrderNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  return `${BRAND.orderPrefix}-${Math.max(counter?.seq ?? 1, 1) + (counter && counter.seq < 100000 ? 100000 : 0)}`;
}

export interface PlacedOrder {
  orderNumber: string;
  accessKey: string;
  /** Present when the shopper still has to pay online. */
  payment?: { keyId: string; providerOrderId: string; amount: number };
}

export const isOnlinePaymentEnabled = (): boolean => razorpayKeys() !== null;

export async function placeOrder(input: CheckoutInput, userId: string): Promise<PlacedOrder> {
  const keys = razorpayKeys();
  if (input.paymentMethod === "online" && !keys) throw new CheckoutError("payment_unavailable", "Online payment isn't available right now. Please choose cash on delivery.");

  const quote = await quoteBag(input.items);
  if (quote.hasIssues || quote.itemCount === 0 || !quote.storeId) {
    throw new CheckoutError("bag_changed", "Some items in your bag have changed. Please review your bag.", quote);
  }
  if (quote.total !== input.expectedTotal) throw new CheckoutError("total_changed", "The total has changed since you opened checkout. Please check the new total.", quote);
  if (input.paymentMethod === "cod" && quote.total > STORE.codLimit) throw new CheckoutError("cod_unavailable", "Cash on delivery isn't available for orders this large. Please pay online.");

  const lines = quote.lines.map((l) => ({ productId: l.productId, sku: l.sku, quantity: l.quantity }));
  if (!(await reserveStock(lines))) {
    throw new CheckoutError("bag_changed", "Sorry, something in your bag just sold out. Please review your bag.", await quoteBag(input.items));
  }

  try {
    const orderNumber = await nextOrderNumber();
    const accessKey = randomBytes(18).toString("base64url");
    const now = new Date();
    const providerOrderId = input.paymentMethod === "online" && keys ? await createPaymentOrder(keys, { amount: quote.total, receipt: orderNumber }) : undefined;
    const shippingAddress = { name: input.name, phone: input.phone, ...input.address, country: "IN" };

    const order = await Order.create({
      orderNumber, accessKey, userId, contact: { name: input.name, email: input.email, phone: input.phone }, shippingAddress,
      currency: "INR", subtotal: quote.subtotal, shipping: quote.shipping, gst: quote.gst, total: quote.total, eta: quote.delivery,
      payment: { provider: input.paymentMethod === "online" ? "razorpay" : "cod", status: "pending", providerOrderId },
    });
    await Shipment.create({
      orderId: order._id, orderNumber, vendorId: quote.storeId, shippingAddress, currency: "INR",
      lines: quote.lines.map((l) => ({
        productId: l.productId, sku: l.sku, title: l.title, variantLabel: l.variantLabel, image: l.image, quantity: l.quantity,
        vendorUnitPrice: l.unitPrice, customerUnitPrice: l.unitPrice, lineTotal: l.lineTotal, gstRate: l.gstRate, gst: l.gst,
      })),
      subtotal: quote.subtotal, shipping: quote.shipping, gst: quote.gst, total: quote.total,
      vendorPayout: { amount: quote.total, currency: "INR" },
      status: "placed", timeline: [{ status: "placed", at: now }], eta: quote.delivery, placedAt: now,
    });

    return { orderNumber, accessKey, ...(providerOrderId && keys ? { payment: { keyId: keys.keyId, providerOrderId, amount: quote.total } } : {}) };
  } catch (error: unknown) {
    await releaseStock(lines);
    logError("shop.placeOrder", error);
    throw error;
  }
}

/** Called after the Razorpay popup reports success. Nothing is marked paid without a valid signature. */
export async function confirmPayment(input: { orderNumber: string; accessKey: string; paymentId: string; signature: string }): Promise<void> {
  const keys = razorpayKeys();
  await connectDb();
  const order = await Order.findOne({ orderNumber: input.orderNumber, accessKey: input.accessKey });
  if (!order || !keys || !order.payment?.providerOrderId) throw new CheckoutError("not_found", "We couldn't find that order.");
  if (order.payment.status === "paid") return;
  if (!verifyPaymentSignature({ orderId: order.payment.providerOrderId, paymentId: input.paymentId, signature: input.signature }, keys.keySecret)) {
    throw new CheckoutError("payment_invalid", "We couldn't confirm that payment. If money was taken, contact us with your order number.");
  }
  await Order.updateOne(
    { _id: order._id },
    { $set: { "payment.status": "paid", "payment.providerPaymentId": input.paymentId, "payment.paidAt": new Date() } },
  );
}

/* ------------------------------ customer order view ------------------------------ */

export interface OrderView {
  orderNumber: string;
  placedAt: string;
  status: string;
  shipmentStatus: string;
  timeline: { status: string; at: string; note?: string }[];
  tracking: { carrier: string; number: string; url?: string } | null;
  contact: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; state: string; postalCode: string };
  lines: { title: string; variantLabel: string; image: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  eta: { minDays: number; maxDays: number } | null;
  payment: { method: "online" | "cod"; status: string; providerOrderId: string | null };
}

export async function getOrderView(orderNumber: string, accessKey: string): Promise<OrderView | null> {
  await connection(); // always read live: an order's status changes as staff work on it
  if (!/^[A-Z]{2}-\d{4,10}$/.test(orderNumber) || !/^[\w-]{16,64}$/.test(accessKey)) return null;
  await connectDb();
  const order = await Order.findOne({ orderNumber, accessKey }).lean();
  if (!order) return null;
  const shipment = await Shipment.findOne({ orderId: order._id }).lean();
  const a = order.shippingAddress;
  return {
    orderNumber: order.orderNumber,
    placedAt: new Date(shipment?.placedAt ?? order.createdAt ?? 0).toISOString(),
    status: order.status,
    shipmentStatus: shipment?.status ?? "placed",
    timeline: (shipment?.timeline ?? []).map((t) => ({ status: t.status, at: new Date(t.at).toISOString(), ...(t.note ? { note: t.note } : {}) })),
    tracking: shipment?.tracking?.number ? { carrier: shipment.tracking.carrier ?? "", number: shipment.tracking.number, ...(shipment.tracking.url ? { url: shipment.tracking.url } : {}) } : null,
    contact: { name: order.contact?.name ?? "", email: order.contact?.email ?? "", phone: order.contact?.phone ?? "" },
    address: { line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode },
    lines: (shipment?.lines ?? []).map((l) => ({ title: l.title, variantLabel: l.variantLabel ?? "", image: l.image ?? "/products/placeholder.svg", quantity: l.quantity, lineTotal: l.lineTotal })),
    subtotal: order.subtotal, shipping: order.shipping, gst: order.gst, total: order.total,
    eta: order.eta?.minDays != null && order.eta.maxDays != null ? { minDays: order.eta.minDays, maxDays: order.eta.maxDays } : null,
    payment: { method: order.payment?.provider === "razorpay" ? "online" : "cod", status: order.payment?.status ?? "pending", providerOrderId: order.payment?.providerOrderId ?? null },
  };
}

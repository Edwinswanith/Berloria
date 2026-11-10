import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { assertAdmin } from "@/lib/auth/admin";
import { LOW_STOCK_THRESHOLD } from "@/lib/data/catalog-shared";
import { connectDb } from "@/lib/db/connect";
import { Order, Product, Shipment } from "@/lib/db/models";
import { deriveOrderStatus, nextStatuses, transitionShipment, type ShipmentState, type ShipmentStatus } from "@/lib/domain/fulfillment";
import { summariseSales, type SalesSummary } from "@/lib/domain/sales";
import { releaseStock } from "@/lib/shop/orders";
import { AdminError } from "./products";

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN: ShipmentStatus[] = ["placed", "accepted", "packed"];

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  placedAt: string;
  customer: string;
  city: string;
  itemCount: number;
  total: number;
  status: ShipmentStatus;
  payment: { method: "online" | "cod"; status: string };
}

export interface AdminOrderDetail extends AdminOrderRow {
  contact: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; state: string; postalCode: string };
  lines: { title: string; sku: string; variantLabel: string; image: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  shipping: number;
  gst: number;
  timeline: { status: string; at: string; note?: string }[];
  tracking: { carrier: string; number: string } | null;
  nextSteps: ShipmentStatus[];
  /** Online orders can't be fulfilled until the money has arrived. */
  blockedByPayment: boolean;
}

async function ready(): Promise<void> {
  await assertAdmin();
  await connectDb();
}

const methodOf = (provider?: string | null): "online" | "cod" => (provider === "razorpay" ? "online" : "cod");

interface Joined {
  order: Awaited<ReturnType<typeof loadOrders>>[number];
  shipment: Awaited<ReturnType<typeof loadShipments>>[number];
}
const loadOrders = (filter: Record<string, unknown>) => Order.find(filter).sort({ createdAt: -1 }).limit(500).lean();
const loadShipments = (orderIds: Types.ObjectId[]) => Shipment.find({ orderId: { $in: orderIds } }).lean();

async function joined(filter: Record<string, unknown> = {}): Promise<Joined[]> {
  const orders = await loadOrders(filter);
  const shipments = await loadShipments(orders.map((o) => o._id));
  return orders.flatMap((order) => {
    const shipment = shipments.find((s) => String(s.orderId) === String(order._id));
    return shipment ? [{ order, shipment }] : [];
  });
}

function toRow({ order, shipment }: Joined): AdminOrderRow {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    placedAt: new Date(shipment.placedAt).toISOString(),
    customer: order.contact?.name ?? "",
    city: order.shippingAddress.city,
    itemCount: shipment.lines.reduce((n, l) => n + l.quantity, 0),
    total: order.total,
    status: shipment.status as ShipmentStatus,
    payment: { method: methodOf(order.payment?.provider), status: order.payment?.status ?? "pending" },
  };
}

const awaitingOnlinePayment = (row: AdminOrderRow): boolean => row.payment.method === "online" && row.payment.status !== "paid" && row.status !== "cancelled";

export type OrderFilter = "all" | "to-fulfil" | "shipped" | "delivered" | "cancelled" | "unpaid";

export async function listAdminOrders(filter: OrderFilter = "all"): Promise<AdminOrderRow[]> {
  await ready();
  const rows = (await joined()).map(toRow);
  switch (filter) {
    case "to-fulfil": return rows.filter((r) => OPEN.includes(r.status) && !awaitingOnlinePayment(r));
    case "unpaid": return rows.filter(awaitingOnlinePayment);
    case "shipped": case "delivered": case "cancelled": return rows.filter((r) => r.status === filter);
    default: return rows;
  }
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  await ready();
  if (!isValidObjectId(id)) return null;
  const [found] = await joined({ _id: id });
  if (!found) return null;
  const { order, shipment } = found;
  const row = toRow(found);
  const a = order.shippingAddress;
  const blockedByPayment = awaitingOnlinePayment(row);
  return {
    ...row,
    contact: { name: order.contact?.name ?? "", email: order.contact?.email ?? "", phone: order.contact?.phone ?? "" },
    address: { line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode },
    lines: shipment.lines.map((l) => ({ title: l.title, sku: l.sku, variantLabel: l.variantLabel ?? "", image: l.image ?? "/products/placeholder.svg", quantity: l.quantity, lineTotal: l.lineTotal })),
    subtotal: order.subtotal, shipping: order.shipping, gst: order.gst,
    timeline: shipment.timeline.map((t) => ({ status: t.status, at: new Date(t.at).toISOString(), ...(t.note ? { note: t.note } : {}) })),
    tracking: shipment.tracking?.number ? { carrier: shipment.tracking.carrier ?? "", number: shipment.tracking.number } : null,
    nextSteps: nextStatuses(row.status).filter((s) => !blockedByPayment || s === "cancelled"),
    blockedByPayment,
  };
}

export interface StatusChange {
  to: ShipmentStatus;
  carrier?: string;
  trackingNumber?: string;
  note?: string;
}

/** Moves an order one step along: confirm → pack → ship → deliver, or cancel. Cancelling puts the stock back. */
export async function updateOrderStatus(id: string, change: StatusChange): Promise<void> {
  await ready();
  if (!isValidObjectId(id)) throw new AdminError("That order doesn't exist.");
  const shipment = await Shipment.findOne({ orderId: id });
  const order = await Order.findById(id);
  if (!shipment || !order) throw new AdminError("That order doesn't exist.");

  const unpaidOnline = order.payment?.provider === "razorpay" && order.payment.status !== "paid";
  if (unpaidOnline && change.to !== "cancelled") throw new AdminError("This order hasn't been paid for yet, so it can't be processed.");

  const carrier = change.carrier?.trim().slice(0, 60) ?? "";
  const number = change.trackingNumber?.trim().slice(0, 60) ?? "";
  if (change.to === "shipped" && !(carrier && number)) throw new AdminError("Enter the courier and tracking number to mark this as shipped.");
  if (change.to === "cancelled" && !change.note?.trim()) throw new AdminError("Give a short reason for cancelling.");

  const current = shipment.status as ShipmentStatus;
  let next: ShipmentState;
  try {
    next = transitionShipment<ShipmentState>(
      { status: current, timeline: shipment.timeline.map((t) => ({ status: t.status as ShipmentStatus, at: t.at, ...(t.note ? { note: t.note } : {}) })) },
      { to: change.to, at: new Date(), ...(change.note?.trim() ? { note: change.note.trim().slice(0, 300) } : {}), ...(change.to === "shipped" ? { tracking: { carrier, number } } : {}) },
    );
  } catch {
    throw new AdminError("This order has already moved on. Refresh the page to see where it is.");
  }

  // Only the update that still sees the old status wins, so two staff can't apply the same step twice.
  const result = await Shipment.updateOne(
    { _id: shipment._id, status: current },
    { $set: { status: next.status, timeline: next.timeline, statusSince: new Date(), ...(next.tracking ? { tracking: next.tracking } : {}) } },
  );
  if (result.modifiedCount !== 1) throw new AdminError("Someone else just updated this order. Refresh the page.");

  if (change.to === "cancelled") await releaseStock(shipment.lines.map((l) => ({ productId: String(l.productId), sku: l.sku, quantity: l.quantity })));
  const collected = change.to === "delivered" && order.payment?.provider === "cod" && order.payment.status !== "paid";
  await Order.updateOne(
    { _id: order._id },
    { $set: { status: deriveOrderStatus([next.status]), ...(collected ? { "payment.status": "paid", "payment.paidAt": new Date() } : {}) } },
  );
}

export interface Dashboard {
  sales: SalesSummary;
  toFulfil: number;
  unpaid: number;
  recent: AdminOrderRow[];
  lowStock: { id: string; title: string; left: number; soldOutSizes: number }[];
}

export async function getDashboard(): Promise<Dashboard> {
  await ready();
  const now = new Date();
  const [all, products] = await Promise.all([
    joined(),
    Product.find({ status: "active" }, { title: 1, variants: 1 }).lean(),
  ]);
  const rows = all.map(toRow);
  const recentEnough = all.filter(({ shipment }) => now.getTime() - new Date(shipment.placedAt).getTime() < 45 * DAY_MS);
  const sales = summariseSales(
    recentEnough.map((j) => {
      const row = toRow(j);
      return {
        placedAt: new Date(j.shipment.placedAt), total: j.order.total, cancelled: row.status === "cancelled", awaitingOnlinePayment: awaitingOnlinePayment(row),
        lines: j.shipment.lines.map((l) => ({ title: l.title, quantity: l.quantity, lineTotal: l.lineTotal })),
      };
    }),
    now,
  );
  const lowStock = products
    .map((p) => ({ id: String(p._id), title: p.title, left: p.variants.reduce((n, v) => n + v.stock, 0), soldOutSizes: p.variants.filter((v) => v.stock === 0).length }))
    .filter((p) => p.left <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.left - b.left)
    .slice(0, 8);

  return {
    sales,
    toFulfil: rows.filter((r) => OPEN.includes(r.status) && !awaitingOnlinePayment(r)).length,
    unpaid: rows.filter(awaitingOnlinePayment).length,
    recent: rows.slice(0, 6),
    lowStock,
  };
}

import "server-only";
import { isValidObjectId } from "mongoose";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db/connect";
import { Order, Shipment, User } from "@/lib/db/models";
import type { SignInInput, SignUpInput } from "./account-input";

export class AccountError extends Error {}

/** Hash checked when the email is unknown, so a wrong email takes as long as a wrong password. */
const DECOY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

export async function registerCustomer(input: SignUpInput): Promise<string> {
  await connectDb();
  if (await User.exists({ email: input.email })) throw new AccountError("There's already an account with that email. Sign in instead.");
  try {
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password), roles: ["customer"], lastLoginAt: new Date() });
    return String(user._id);
  } catch (error: unknown) {
    // Two sign-ups with the same email at the same moment: the unique index lets only one through.
    if ((error as { code?: number }).code === 11000) throw new AccountError("There's already an account with that email. Sign in instead.");
    throw error;
  }
}

/** Returns the user id, or null for any wrong email/password combination. */
export async function authenticateCustomer(input: SignInInput): Promise<string | null> {
  await connectDb();
  const user = await User.findOne({ email: input.email, roles: "customer" }).select("+passwordHash").lean();
  const matches = await verifyPassword(input.password, user?.passwordHash ?? DECOY_HASH);
  if (!user || !matches) return null;
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return String(user._id);
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
}

export async function getCustomer(id: string): Promise<CustomerProfile | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const user = await User.findById(id, { name: 1, email: 1 }).lean();
  return user ? { id, name: user.name ?? "", email: user.email ?? "" } : null;
}

export interface CustomerOrder {
  orderNumber: string;
  accessKey: string;
  placedAt: string;
  status: string;
  total: number;
  itemCount: number;
  firstItem: string;
  image: string;
}

export async function listCustomerOrders(userId: string): Promise<CustomerOrder[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  const shipments = await Shipment.find({ orderId: { $in: orders.map((o) => o._id) } }).lean();
  return orders.flatMap((order) => {
    const shipment = shipments.find((s) => String(s.orderId) === String(order._id));
    if (!shipment) return [];
    return [{
      orderNumber: order.orderNumber, accessKey: order.accessKey, placedAt: new Date(shipment.placedAt).toISOString(), status: shipment.status,
      total: order.total, itemCount: shipment.lines.reduce((n, l) => n + l.quantity, 0),
      firstItem: shipment.lines[0]?.title ?? "", image: shipment.lines[0]?.image ?? "/products/placeholder.svg",
    }];
  });
}

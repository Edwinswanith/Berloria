import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CUSTOMER_COOKIE, signSession, verifySession } from "./session-token";

/** Shoppers stay signed in for 30 days on a device. */
const TTL_SECONDS = 30 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set. See .env.example.");
  return value;
}

export async function createCustomerSession(userId: string): Promise<void> {
  const token = signSession({ sub: userId, role: "customer" }, secret(), { now: new Date(), ttlSeconds: TTL_SECONDS });
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL_SECONDS,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** The signed-in shopper's user id, or null. */
export async function getCustomerId(): Promise<string | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  await connection(); // the expiry check reads the clock
  return verifySession(token, process.env.SESSION_SECRET ?? "", new Date(), "customer")?.sub ?? null;
}

export async function requireCustomerId(next = "/shop"): Promise<string> {
  const id = await getCustomerId();
  if (!id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return id;
}

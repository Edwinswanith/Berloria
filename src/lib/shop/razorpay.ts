import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay is used through its REST API; card and UPI details never touch our server. */
const API = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 15_000;

export class PaymentProviderError extends Error {}

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

export function razorpayKeys(env: Record<string, string | undefined> = process.env): RazorpayKeys | null {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

/** Razorpay signs `order_id|payment_id` with the key secret; a match proves the payment is real. */
export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }, keySecret: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  const given = Buffer.from(input.signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/** Creates the payment order the checkout popup pays against. Amount in paise. */
export async function createPaymentOrder(keys: RazorpayKeys, input: { amount: number; receipt: string }): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}` },
      body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error: unknown) {
    throw new PaymentProviderError(`Could not reach Razorpay: ${error instanceof Error ? error.message : String(error)}`);
  }
  const body = (await response.json().catch(() => null)) as { id?: unknown; error?: { description?: string } } | null;
  if (!response.ok || typeof body?.id !== "string") {
    throw new PaymentProviderError(`Razorpay refused the order (${response.status}): ${body?.error?.description ?? "no details"}`);
  }
  return body.id;
}

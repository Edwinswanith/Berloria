import { z } from "zod";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { logError } from "@/lib/log";
import { CheckoutError, confirmPayment } from "@/lib/shop/orders";

const limiter = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 });
const schema = z.object({
  orderNumber: z.string().max(20),
  accessKey: z.string().max(64),
  paymentId: z.string().min(5).max(64),
  signature: z.string().min(16).max(256),
});

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail("Not allowed.", 403);
  if (!limiter.hit(clientIp(request)).allowed) return fail("Too many attempts. Please try again in a few minutes.", 429);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("That payment confirmation isn't valid.", 400);
  try {
    await confirmPayment(parsed.data);
    return ok({ paid: true });
  } catch (error: unknown) {
    if (error instanceof CheckoutError) return fail(error.message, error.code === "not_found" ? 404 : 400);
    logError("api.checkout.verify", error);
    return fail("We couldn't confirm the payment. Please contact us with your order number.", 500);
  }
}

import { getCustomerId } from "@/lib/auth/customer";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { logError } from "@/lib/log";
import { parseCheckout } from "@/lib/shop/checkout-input";
import { CheckoutError, placeOrder } from "@/lib/shop/orders";

const limiter = createRateLimiter({ limit: 12, windowMs: 10 * 60_000 });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail("Not allowed.", 403);
  if (!limiter.hit(clientIp(request)).allowed) return fail("Too many attempts. Please try again in a few minutes.", 429);

  const userId = await getCustomerId();
  if (!userId) return fail("Please sign in to place your order.", 401);

  const parsed = parseCheckout(await readJson(request));
  if (!parsed.success) return fail("Please check the highlighted details.", 400, { fieldErrors: parsed.errors });

  try {
    return ok(await placeOrder(parsed.data, userId));
  } catch (error: unknown) {
    if (error instanceof CheckoutError) {
      return Response.json({ success: false, error: error.message, code: error.code, quote: error.quote ?? null }, { status: 409 });
    }
    logError("api.checkout", error);
    return fail("We couldn't place your order. Nothing has been charged — please try again.", 500);
  }
}

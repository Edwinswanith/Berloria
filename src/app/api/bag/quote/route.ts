import { createRateLimiter } from "@/lib/auth/rate-limit";
import { sanitizeItems } from "@/lib/domain/bag";
import { clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { logError } from "@/lib/log";
import { isOnlinePaymentEnabled } from "@/lib/shop/orders";
import { quoteBag } from "@/lib/shop/quote";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

/** Prices a bag: the browser sends SKUs and quantities, the server answers with everything else. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail("Not allowed.", 403);
  if (!limiter.hit(clientIp(request)).allowed) return fail("Too many requests. Please wait a moment.", 429);
  const body = (await readJson(request)) as { items?: unknown } | null;
  try {
    const quote = await quoteBag(sanitizeItems(body?.items));
    return ok({ quote, onlinePayment: isOnlinePaymentEnabled() });
  } catch (error: unknown) {
    logError("api.bag.quote", error);
    return fail("We couldn't load your bag. Please try again.", 500);
  }
}

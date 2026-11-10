import { z } from "zod";
import { fail, guard, ok, toErrorResponse } from "@/lib/admin/http";
import { generateShot } from "@/lib/admin/products";
import { createRateLimiter } from "@/lib/auth/rate-limit";

/** Image generation can take a while; give the platform room. */
export const maxDuration = 120;

const Body = z.object({ shot: z.string().min(1).max(40) });

/** Each generated image costs money, so cap how fast one login can request them. */
const limiter = createRateLimiter({ limit: 40, windowMs: 10 * 60_000 });

/** Generate one AI photo (one shot preset) for a product. Called once per shot, in parallel, by the studio UI. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/products/[id]/generate">) {
  try {
    const session = await guard(request);
    const { id } = await ctx.params;
    const body = Body.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("Choose which photo to generate.", 400);

    const limit = limiter.hit(session.sub);
    if (!limit.allowed) return fail(`Too many photos requested. Try again in ${Math.ceil(limit.retryAfterMs / 60_000)} min.`, 429);

    return ok(await generateShot(id, body.data.shot));
  } catch (error: unknown) {
    return toErrorResponse("api.admin.generate", error);
  }
}

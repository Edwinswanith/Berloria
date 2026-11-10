import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit, then blocks until the window passes", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect([1, 2, 3].map(() => limiter.hit("ip", 0).allowed)).toEqual([true, true, true]);
    const blocked = limiter.hit("ip", 500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(500);
    expect(limiter.hit("ip", 1001).allowed).toBe(true);
  });

  it("tracks keys separately and can be reset", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.hit("a", 0).allowed).toBe(true);
    expect(limiter.hit("b", 0).allowed).toBe(true);
    expect(limiter.hit("a", 1).allowed).toBe(false);
    limiter.reset("a");
    expect(limiter.hit("a", 2).allowed).toBe(true);
  });
});

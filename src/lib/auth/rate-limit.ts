export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export interface RateLimiter {
  hit(key: string, now?: number): RateLimitResult;
  reset(key: string): void;
}

/**
 * Fixed-window, in-memory limiter. Good enough for one server; on serverless each instance
 * keeps its own counts, so move to a shared store (e.g. Upstash) before relying on it at scale.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.start >= opts.windowMs) {
        windows.set(key, { start: now, count: 1 });
        return { allowed: true, retryAfterMs: 0 };
      }
      if (current.count >= opts.limit) return { allowed: false, retryAfterMs: current.start + opts.windowMs - now };
      windows.set(key, { start: current.start, count: current.count + 1 });
      return { allowed: true, retryAfterMs: 0 };
    },
    reset(key) {
      windows.delete(key);
    },
  };
}

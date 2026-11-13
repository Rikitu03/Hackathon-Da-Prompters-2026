/** Best-effort fixed-window limiter. In-memory, so per server instance only (serverless: not shared). */
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    take(key: string): RateLimitResult {
      const t = now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { ok: true };
      }
      if (entry.count >= opts.limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
      entry.count += 1;
      return { ok: true };
    },
  };
}

/** First hop of x-forwarded-for (Vercel sets it), else "unknown". */
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

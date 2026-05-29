import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * LIMITATION: state lives in the process, so it does NOT work across multiple
 * serverless instances or survive redeploys. It is a best-effort stopgap for
 * abuse on public endpoints. Before production, back this with a durable store
 * (e.g. Upstash Redis / `@upstash/ratelimit`) and keep the same interface.
 */
const hits = new Map<string, number[]>();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      const live = times.filter((time) => time > cutoff);
      if (live.length === 0) hits.delete(k);
      else hits.set(k, live);
    }
  }

  return true;
}

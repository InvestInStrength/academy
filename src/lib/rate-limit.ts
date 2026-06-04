import "server-only";

/**
 * Rate limiter with two backends behind one async interface.
 *
 * 1. DURABLE (preferred): a fixed-window counter in Upstash Redis via its REST
 *    API, shared across every serverless instance and surviving redeploys.
 *    Active only when both `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are set. No SDK dependency — one HTTP round-trip.
 * 2. IN-MEMORY fallback: a per-process sliding window. Used when Upstash isn't
 *    configured, or if a Redis call fails (fail-soft — a Redis hiccup must never
 *    hard-block legitimate candidates). Does NOT span instances; a stopgap only.
 *
 * Callers don't care which backend answered — `rateLimit()` returns true when
 * the action is allowed, false when the limit is exceeded.
 */

const hits = new Map<string, number[]>();

/** Per-process sliding-window limiter. Exported for tests and used as the
 * fallback when the durable store is unavailable. */
export function inMemoryRateLimit(
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

/** Upstash REST pipeline body for a fixed-window counter: bump the counter,
 * then set the window TTL only if the key doesn't already have one (so the
 * window starts at the first hit and the counter resets when it expires). */
export function buildPipelineBody(
  key: string,
  windowMs: number,
): unknown[][] {
  return [
    ["INCR", key],
    ["PEXPIRE", key, windowMs, "NX"],
  ];
}

/** Pull the INCR result (the current count in the window) out of an Upstash
 * `/pipeline` response. Returns null when the shape is unexpected. */
export function extractCount(payload: unknown): number | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const first = payload[0] as { result?: unknown; error?: unknown };
  if (first && typeof first.result === "number") return first.result;
  return null;
}

/**
 * Durable fixed-window check via Upstash REST. Returns true/false when Redis
 * answered, or null when it couldn't (so the caller can fall back). Never
 * throws.
 */
async function durableRateLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean | null> {
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPipelineBody(`rl:${key}`, windowMs)),
      // Rate-limit state must never be cached.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const count = extractCount(await res.json());
    if (count === null) return null;
    return count <= limit;
  } catch {
    return null;
  }
}

/** Returns true if the action is allowed, false if the limit is exceeded. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const durable = await durableRateLimit(url, token, key, limit, windowMs);
    if (durable !== null) return durable;
    // Fall through to the in-memory stopgap on any Redis failure.
  }

  return inMemoryRateLimit(key, limit, windowMs);
}

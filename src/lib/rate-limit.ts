import "server-only";

/**
 * Rate limiter with two backends behind one async interface.
 *
 * 1. DURABLE (preferred): a fixed-window counter in Upstash Redis via its REST
 *    API, shared across every serverless instance and surviving redeploys.
 *    Active when Redis REST credentials are present under EITHER supported
 *    naming convention (see `redisRestCredentials`). No SDK dependency — one
 *    HTTP round-trip.
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

/**
 * Resolves the Redis REST credentials, accepting BOTH naming conventions:
 *
 *  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — what you get when
 *    copying keys straight out of the Upstash console (what
 *    `.env.local.example` documents, and what local dev typically uses).
 *  - `KV_REST_API_URL` / `KV_REST_API_TOKEN` — what the Upstash Marketplace
 *    integration injects into a Vercel project. Same service, same REST
 *    protocol, different variable names.
 *
 * Supporting only the first set is why production rate limiting silently ran on
 * the in-memory fallback: the integration had provisioned a database, but under
 * names this module never read — so it received zero commands and Upstash
 * eventually archived it for inactivity.
 *
 * Deliberately never reads `KV_REST_API_READ_ONLY_TOKEN`: the limiter issues
 * INCR/PEXPIRE, which a read-only token cannot execute.
 *
 * Exported for tests.
 */
export function redisRestCredentials(
  env: Record<string, string | undefined> = process.env,
): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/** Returns true if the action is allowed, false if the limit is exceeded. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const credentials = redisRestCredentials();

  if (credentials) {
    const { url, token } = credentials;
    const durable = await durableRateLimit(url, token, key, limit, windowMs);
    if (durable !== null) return durable;
    // Fall through to the in-memory stopgap on any Redis failure.
  }

  return inMemoryRateLimit(key, limit, windowMs);
}

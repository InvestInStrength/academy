import type { NextRequest } from "next/server";

import { CERTIFICATES_BUCKET } from "@/lib/certificate/storage";
import { reportError } from "@/lib/logger";
import { rateLimit, redisRestCredentials } from "@/lib/rate-limit";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * `/api/health` — the platform's machine-readable statement of health, and its
 * first API route (until now an uptime monitor could only fetch a page and
 * guess).
 *
 * Two modes:
 *
 *  - **shallow** (default): pure process answer, no I/O. This is what a monitor
 *    hammers every 30s, so it must stay free — it touches no database, no
 *    storage and no third party. A 200 means "a build is deployed and serving".
 *  - **deep** (`?deep=1`): probes each dependency independently, so one slow
 *    dependency can never hang the probe and a single failure never masks the
 *    others.
 *
 * Required vs advisory (this is the 503 decision, and it is deliberate):
 *  - `database` is REQUIRED: without Postgres nothing can be graded, issued or
 *    verified. Down ⇒ 503 ⇒ page someone.
 *  - `storage`, `email` and `rateLimitStore` are ADVISORY. Each has a designed
 *    degradation the platform already relies on — asset generation is
 *    explicitly best-effort and never blocks issuance, `certificate-email.ts`
 *    returns "not configured" instead of throwing, and `rate-limit.ts` falls
 *    back to the in-memory window. Marking them required would page someone at
 *    3am for a system that is still certifying candidates correctly.
 *
 * ACCESS. Shallow is open — monitors do not carry credentials, and it performs
 * no I/O. Deep is NOT open: every deep call spends two service-role round-trips
 * against the production project, and its per-IP limiter runs on the in-memory
 * fallback whenever Redis is unconfigured (exactly today's production state),
 * which on a fanned-out serverless deployment is not a cap at all. It therefore
 * requires `Authorization: Bearer $HEALTH_CHECK_TOKEN`, and answers 404 — not
 * 401 — when the token is absent or wrong, so the mode's existence is not
 * advertised. Without HEALTH_CHECK_TOKEN set, deep is available only outside
 * production.
 *
 * Neither mode leaks configuration: no env values, no connection strings, no
 * error messages, and dependency detail (including whether rate limiting is
 * durable) is returned ONLY to an authenticated deep caller. A failing check
 * returns a support reference; the error itself goes to the structured log
 * under that same reference.
 */

export const dynamic = "force-dynamic";

/**
 * Short enough that a hung dependency cannot outlive a monitor's own timeout,
 * but with real headroom: a plain `select` against the production project
 * measured ~1.45s from a developer machine (2026-08-01), and a cold serverless
 * invocation is slower still. At 2.5s this endpoint produced a false
 * "unhealthy" against a database that was demonstrably answering — and a health
 * check that cries wolf gets muted, which is worse than not having one.
 */
const CHECK_TIMEOUT_MS = 5_000;

/** Deep mode is the only mode that costs anything, so it is capped per IP — an
 * unauthenticated endpoint must not be usable as a database load amplifier.
 * Shallow stays unlimited: that is the one monitors poll. */
const DEEP_LIMIT = 30;
const DEEP_WINDOW_MS = 60_000;

type CheckStatus = "ok" | "down" | "timeout" | "not_configured";

type Check = {
  status: CheckStatus;
  required: boolean;
  durationMs?: number;
  /** Present only on failure — the key into the structured logs. */
  reference?: string;
};

class ProbeTimeout extends Error {
  constructor(ms: number) {
    super(`Probe exceeded ${ms}ms`);
    this.name = "ProbeTimeout";
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new ProbeTimeout(ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Runs one dependency probe and converts any outcome — including a hang — into
 * a check result. Never throws, so `Promise.all` over the probes always
 * resolves and one dead dependency cannot hide the state of the rest. */
async function runCheck(
  name: string,
  required: boolean,
  probe: () => Promise<void>,
): Promise<Check> {
  const started = Date.now();
  try {
    await withTimeout(probe(), CHECK_TIMEOUT_MS);
    return { status: "ok", required, durationMs: Date.now() - started };
  } catch (error) {
    const durationMs = Date.now() - started;
    const timedOut = error instanceof ProbeTimeout;
    const reference = reportError(
      timedOut ? "health.check_timeout" : "health.check_failed",
      error,
      { check: name, durationMs },
    );
    return { status: timedOut ? "timeout" : "down", required, durationMs, reference };
  }
}

/** Cheapest possible round-trip that proves Postgres is reachable AND the
 * service-role credential is accepted: one row of a one-row table. */
async function probeDatabase(): Promise<void> {
  const service = createSupabaseServiceRoleClient();
  const { error } = await service.from("platform_settings").select("id").limit(1);
  if (error) throw error;
}

/**
 * Fetches the bucket's metadata: it proves Storage answers AND that the
 * certificates bucket exists, which is the actual precondition for asset
 * generation. Preferred over listing objects — a list is a heavier call whose
 * failure modes (prefix handling, permissions on an empty prefix) are not
 * "storage is down", and it was observed reporting a false failure. Nothing
 * about the bucket is returned to the caller.
 */
async function probeStorage(): Promise<void> {
  const service = createSupabaseServiceRoleClient();
  const { error } = await service.storage.getBucket(CERTIFICATES_BUCKET);
  if (error) throw error;
}

/** Presence only — never the value, and never a live send. */
function checkEmail(): Check {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
  return { status: configured ? "ok" : "not_configured", required: false };
}

/** Presence only. Answers the standing production question "is rate limiting
 * actually durable, or is this instance silently on the memory fallback?". */
function checkRateLimitStore(): Check {
  return {
    status: redisRestCredentials() ? "ok" : "not_configured",
    required: false,
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/** Identifies the build that is answering. Not sensitive — it is the only way
 * to tell which deploy a monitor is talking to during a rollback. */
function commit(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
}

/** Constant-time-ish comparison. Overkill for a health token, but cheap and it
 * keeps the endpoint from being a timing oracle. */
function tokenMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function deepAuthorized(request: NextRequest): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN?.trim();
  // No token configured: allow deep outside production so `pnpm dev` and CI can
  // exercise it, but never expose it on a deployed production build.
  if (!expected) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return provided.length > 0 && tokenMatches(provided, expected);
}

export async function GET(request: NextRequest) {
  const deepParam = request.nextUrl.searchParams.get("deep");
  const deep = deepParam === "1" || deepParam === "true";

  // Shallow: proof of life only. Deliberately no commit SHA and no uptime —
  // an open endpoint should not help fingerprint which build is serving.
  if (!deep) {
    return jsonResponse({ status: "ok" }, 200);
  }

  if (!deepAuthorized(request)) {
    // 404, not 401/403: an unauthenticated caller learns nothing about whether
    // a deep mode exists at all.
    return jsonResponse({ error: "not_found" }, 404);
  }

  const uptimeMs = Math.round(process.uptime() * 1000);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Fail-open on a limiter hiccup: a probe endpoint that blocks itself is worse
  // than one that answers a few extra times. The token above is the real guard;
  // this only bounds an authorized monitor that has gone haywire.
  const allowed = await withTimeout(
    rateLimit(`health-deep:${ip}`, DEEP_LIMIT, DEEP_WINDOW_MS),
    CHECK_TIMEOUT_MS,
  ).catch(() => true);

  if (!allowed) {
    return jsonResponse({ status: "rate_limited" }, 429);
  }

  const [database, storage] = await Promise.all([
    runCheck("database", true, probeDatabase),
    runCheck("storage", false, probeStorage),
  ]);

  const checks: Record<string, Check> = {
    database,
    storage,
    email: checkEmail(),
    rateLimitStore: checkRateLimitStore(),
  };

  const values = Object.values(checks);
  const requiredDown = values.some((check) => check.required && check.status !== "ok");
  const anyDown = values.some((check) => check.status !== "ok");

  return jsonResponse(
    {
      status: requiredDown ? "unhealthy" : anyDown ? "degraded" : "ok",
      commit: commit(),
      uptimeMs,
      checks,
    },
    requiredDown ? 503 : 200,
  );
}

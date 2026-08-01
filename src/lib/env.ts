/**
 * Public environment variables (safe to read in the browser).
 *
 * These are inlined by Next.js at build time because they are prefixed with
 * `NEXT_PUBLIC_`. The Supabase anon key is intentionally public — row level
 * security is what protects the data, not the key.
 *
 * The service-role key is deliberately NOT read here. It must never reach the
 * browser. Read it only inside `src/lib/supabase/service.ts` (server-only).
 *
 * Everything in this module is validated EAGERLY, at import time, so a
 * misconfigured deploy dies during the build instead of degrading silently in
 * front of a candidate.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Only an absolute http(s) URL survives being frozen into a certificate
 * snapshot — a relative path is meaningless once the certificate is emailed,
 * printed or scanned from a QR code. */
function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/*
 * NEXT_PUBLIC_SITE_URL is boot-critical because `verificationUrl()` bakes it
 * into `certificate_public_snapshot` and the certificate QR code at issue time,
 * and that snapshot is immutable by design: a single deploy without this
 * variable mints permanently broken certificates that no later fix can repair.
 * Production therefore refuses to build/boot rather than run degraded.
 *
 * Dev and test only warn: `public-url.ts` keeps its relative-path fallback
 * there, so `pnpm dev` and the unit suite need no extra setup. The warning is a
 * bare `console.warn` on purpose — `@/lib/logger` is `server-only` and this
 * module is bundled into the browser too.
 */
if (!isAbsoluteHttpUrl(rawSiteUrl)) {
  const problem = rawSiteUrl
    ? `NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL, got: ${rawSiteUrl}`
    : "Missing environment variable: NEXT_PUBLIC_SITE_URL";

  if (process.env.NODE_ENV === "production") {
    throw new Error(problem);
  }

  console.warn(
    `[env] ${problem} — public links fall back to relative paths. Certificates issued in this environment will carry unusable verification URLs.`,
  );
}

/*
 * NOTE: the validated site URL is intentionally NOT re-exported here.
 * `public-url.ts` is the single consumer and reads `process.env` directly, so
 * that it stays importable by the unit suite without this module's eager
 * Supabase validation. The value of the check above is the boot-time refusal,
 * not the derived constant.
 */
export const publicEnv = {
  supabaseUrl,
  supabaseAnonKey,
} as const;

/**
 * Builds public-facing URLs from NEXT_PUBLIC_SITE_URL. Used for candidate access
 * links and certificate verification links. Falls back to a relative path when
 * the site URL is not configured — which `env.ts` permits only outside
 * production, because `verificationUrl()` output is frozen into the immutable
 * certificate snapshot and QR code.
 *
 * Strips ALL trailing slashes, not just one: a value like
 * `https://example.com//` would otherwise produce `https://example.com//verify/…`,
 * and that string is permanent once a certificate is issued.
 *
 * Deliberately reads `process.env` rather than importing `publicEnv` from
 * `./env`. That module validates eagerly at import time and throws when the
 * Supabase variables are absent, which would drag a hard environment dependency
 * into every consumer — including the unit suite, which imports this file
 * directly and supplies no Supabase configuration.
 */
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
}

/** Personal candidate access link for a certification assignment. */
export function certificationUrl(accessToken: string): string {
  return `${siteUrl()}/certification/${accessToken}`;
}

/** Public certificate verification link (used from a later slice). */
export function verificationUrl(verificationToken: string): string {
  return `${siteUrl()}/verify/${verificationToken}`;
}

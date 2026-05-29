/**
 * Builds public-facing URLs from NEXT_PUBLIC_SITE_URL. Used for candidate access
 * links and (later) certificate verification links. Falls back to a relative
 * path when the site URL is not configured.
 */
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

/** Personal candidate access link for a certification assignment. */
export function certificationUrl(accessToken: string): string {
  return `${siteUrl()}/certification/${accessToken}`;
}

/** Public certificate verification link (used from a later slice). */
export function verificationUrl(verificationToken: string): string {
  return `${siteUrl()}/verify/${verificationToken}`;
}

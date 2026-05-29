type ClassValue = string | number | null | false | undefined;

/** Minimal className joiner (clsx-lite). Filters falsy values and joins. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

/** Formats an ISO timestamp as a short, locale-stable date (e.g. "27 May 2026"). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

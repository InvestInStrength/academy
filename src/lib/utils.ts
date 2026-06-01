import type { Locale } from "@/types/database";

type ClassValue = string | number | null | false | undefined;

/** Minimal className joiner (clsx-lite). Filters falsy values and joins. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

const LOCALE_BCP47: Record<Locale, string> = {
  de: "de-DE",
  en: "en-GB",
};

/** Formats an ISO timestamp as a short, locale-aware date.
 * Defaults to en-GB for back-compat with existing callers. */
export function formatDate(iso: string, locale: Locale = "en"): string {
  return new Date(iso).toLocaleDateString(LOCALE_BCP47[locale] ?? "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Long-form locale-aware date (e.g. "15 June 2026" / "15. Juni 2026"). */
export function formatLongDate(iso: string, locale: Locale = "en"): string {
  return new Date(iso).toLocaleDateString(LOCALE_BCP47[locale] ?? "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

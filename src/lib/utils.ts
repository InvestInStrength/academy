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

/**
 * Parses a value that may be a full ISO timestamp OR a bare `YYYY-MM-DD`.
 *
 * `new Date("2026-03-12")` is read as UTC midnight, which formats as the
 * PREVIOUS day anywhere west of Greenwich. Postgres `date` columns
 * (`courses.event_date`) arrive in exactly that form, so a date-only string is
 * built as local midnight instead — the day an admin typed is the day every
 * surface shows. This matches how the certificate renderer parses it
 * (`src/lib/certificate/render.ts`), so the printed document and the UI can
 * never disagree about which day a seminar was held.
 */
function toDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return new Date(value);
  return new Date(
    Number(dateOnly[1]),
    Number(dateOnly[2]) - 1,
    Number(dateOnly[3]),
  );
}

/** Formats an ISO timestamp or `YYYY-MM-DD` as a short, locale-aware date.
 * Defaults to en-GB for back-compat with existing callers. */
export function formatDate(iso: string, locale: Locale = "en"): string {
  return toDate(iso).toLocaleDateString(LOCALE_BCP47[locale] ?? "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Long-form locale-aware date (e.g. "15 June 2026" / "15. Juni 2026"). */
export function formatLongDate(iso: string, locale: Locale = "en"): string {
  return toDate(iso).toLocaleDateString(LOCALE_BCP47[locale] ?? "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

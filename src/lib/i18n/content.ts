import type { Locale } from "@/types/database";

/**
 * Picks the locale-resolved value for a row that has both a legacy single-
 * language column (e.g. `title`) and `_de` / `_en` localized columns.
 *
 * Phase semantics (Slice 7b, pre-dual-write):
 *   - For locale `'de'`: return the legacy column directly. It IS the German
 *     source of truth right now. The `_de` column was one-time backfilled
 *     by migration 0003 and can lag behind admin edits until a follow-up
 *     slice wires dual-write. Reading `_de` for DE would risk staleness.
 *   - For non-DE locales: try the locale-specific column, then fall back to
 *     `_de`, then to the legacy column. The cross-language `_de`/legacy
 *     fallback is the "missing translation" rule — show DE rather than blank.
 *
 * Empty strings are treated as missing — an explicit empty translation is
 * never preferred over a populated fallback.
 *
 * When admin writes start dual-writing into `_de`, this helper can be
 * updated to prefer `_de` for DE too. Until then, single-source-of-truth wins.
 */
export function pickLocalized<TRow extends Record<string, unknown>>(
  row: TRow,
  fieldBase: string,
  locale: Locale,
): string | null {
  const get = (key: string): string | null => {
    const value = row[key as keyof TRow];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  if (locale === "de") {
    return get(fieldBase);
  }
  return (
    get(`${fieldBase}_${locale}`) ??
    get(`${fieldBase}_de`) ??
    get(fieldBase)
  );
}

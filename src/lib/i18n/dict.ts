import type { Locale } from "@/types/database";

import deMessages from "./messages.de.json";
import enMessages from "./messages.en.json";

/**
 * Pure dictionary helpers. Safe to import from tests, no Supabase, no
 * `server-only`. Server code goes through `./index.ts` which adds the
 * cached active-language read.
 */

export const DEFAULT_LOCALE: Locale = "de";

const messagesByLocale: Record<Locale, Record<string, string>> = {
  de: deMessages as Record<string, string>,
  en: enMessages as Record<string, string>,
};

export function getDictionary(locale: Locale): Record<string, string> {
  return messagesByLocale[locale] ?? messagesByLocale[DEFAULT_LOCALE];
}

/** Returns `dict[key]` with `{name}`-style param substitution. Falls back to
 * the key itself when missing — no cross-locale lookup, so a missing key is
 * loud rather than silently leaking another language. */
export function t(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = dict[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** HTML-escapes a value that will be interpolated into markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Like `t()`, but HTML-escapes every param value. REQUIRED for any message
 * rendered via `dangerouslySetInnerHTML`: the template's own trusted markup
 * (e.g. `<strong>`) survives, while interpolated data — such as admin-entered
 * questionnaire titles shown on candidate pages — cannot inject HTML. */
export function tHtml(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return t(dict, key);
  const escaped: Record<string, string> = {};
  for (const [name, value] of Object.entries(params)) {
    escaped[name] = escapeHtml(String(value));
  }
  return t(dict, key, escaped);
}

import "server-only";

import { cache } from "react";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import type { Locale } from "@/types/database";

import { DEFAULT_LOCALE, getDictionary, t } from "./dict";

/**
 * Server-only i18n runtime — Slice 7a foundation.
 *
 * Single global active language read from `public.platform_settings` via the
 * service-role client. `getActiveLanguage()` is wrapped in React `cache()` so
 * multiple server components in the same request share one DB read. No
 * cross-request caching — a superadmin flip is reflected on the next request.
 */

export type { Locale };
export { getDictionary, t, DEFAULT_LOCALE };

/** Reads `platform_settings.active_language`. Returns 'de' on any error so the
 * platform always renders something (DE-first invariant). */
export const getActiveLanguage = cache(async (): Promise<Locale> => {
  try {
    const service = createSupabaseServiceRoleClient();
    const { data } = await service
      .from("platform_settings")
      .select("active_language")
      .eq("id", true)
      .maybeSingle();
    const value = data?.active_language;
    if (value === "de" || value === "en") return value;
    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** Convenience for server components: resolves the active locale + a bound
 * `t()` in one go. */
export async function getServerT(): Promise<{
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}> {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  return {
    locale,
    t: (key, params) => t(dict, key, params),
  };
}

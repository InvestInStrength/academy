"use client";

import { createContext, useContext, useMemo } from "react";

import type { Locale } from "@/types/database";
import { DEFAULT_LOCALE, getDictionary, t as rawT } from "./dict";

/**
 * Client-side locale plumbing.
 *
 * Server layouts call `getActiveLanguage()` and wrap their subtree in
 * `<LocaleProvider locale={...}>`. Client components inside that subtree call
 * `useT()` for a bound `t(key, params?)`.
 *
 * Dicts are tiny JSON; bundling both DE and EN into the client is cheaper than
 * threading a dictionary object through every component.
 */

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useMemo(() => {
    const dict = getDictionary(locale);
    return (key: string, params?: Record<string, string | number>) =>
      rawT(dict, key, params);
  }, [locale]);
}

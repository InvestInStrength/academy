"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/admin";
import type { Locale } from "@/types/database";

const LANGUAGE_PATH = "/admin/settings/language";

type Settings = {
  active_language: Locale;
  enabled_languages: Locale[];
};

async function loadSettings(
  supabase: Awaited<ReturnType<typeof requireSuperadmin>>["supabase"],
): Promise<Settings | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("active_language, enabled_languages")
    .eq("id", true)
    .maybeSingle<Settings>();
  return data;
}

/** Adds 'en' to enabled_languages. No-op if already enabled. */
export async function enableEnglish(_formData: FormData): Promise<void> {
  const { supabase } = await requireSuperadmin();
  const current = await loadSettings(supabase);
  if (!current) return;
  if (current.enabled_languages.includes("en")) {
    revalidatePath(LANGUAGE_PATH);
    return;
  }
  const next: Locale[] = [...current.enabled_languages, "en"];
  await supabase
    .from("platform_settings")
    .update({ enabled_languages: next })
    .eq("id", true);
  revalidatePath(LANGUAGE_PATH);
  revalidatePath("/admin/settings");
}

/** Removes 'en' from enabled_languages. Refuses while 'en' is the active
 * language — the DB CHECK would block it too. */
export async function disableEnglish(_formData: FormData): Promise<void> {
  const { supabase } = await requireSuperadmin();
  const current = await loadSettings(supabase);
  if (!current) return;
  if (current.active_language === "en") {
    revalidatePath(LANGUAGE_PATH);
    return;
  }
  const next = current.enabled_languages.filter((l) => l !== "en");
  if (next.length === 0) return; // defensive — never empty
  await supabase
    .from("platform_settings")
    .update({ enabled_languages: next })
    .eq("id", true);
  revalidatePath(LANGUAGE_PATH);
  revalidatePath("/admin/settings");
}

/** Sets active_language. Refuses if the target is not in enabled_languages
 * — the DB CHECK enforces this; we pre-validate for a clean UX. */
export async function setActiveLanguage(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperadmin();
  const raw = String(formData.get("language") ?? "");
  if (raw !== "de" && raw !== "en") return;
  const current = await loadSettings(supabase);
  if (!current) return;
  if (!current.enabled_languages.includes(raw)) return;
  if (current.active_language === raw) {
    revalidatePath(LANGUAGE_PATH);
    return;
  }
  await supabase
    .from("platform_settings")
    .update({ active_language: raw })
    .eq("id", true);
  // Active-language change affects every server render.
  revalidatePath(LANGUAGE_PATH);
  revalidatePath("/", "layout");
}

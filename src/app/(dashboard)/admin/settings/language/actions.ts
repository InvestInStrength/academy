"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { reportError } from "@/lib/logger";
import type { FormState } from "@/lib/form";
import type { Locale } from "@/types/database";

const LANGUAGE_PATH = "/admin/settings/language";
/** The migration that seeds the single `platform_settings` row. */
const SETTINGS_MIGRATION = "0002_platform_settings_and_attempt_language.sql";

type Settings = {
  active_language: Locale;
  enabled_languages: Locale[];
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** `reference` is set only when the read itself failed — a missing row is a
 * different problem (unapplied migration) and reads differently to the admin. */
type SettingsRead = {
  settings: Settings | null;
  reference: string | null;
};

async function loadSettings(
  supabase: Awaited<ReturnType<typeof requireSuperadmin>>["supabase"],
): Promise<SettingsRead> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("active_language, enabled_languages")
    .eq("id", true)
    .maybeSingle<Settings>();
  if (error) {
    return {
      settings: null,
      reference: reportError("admin.settings.language.load_failed", error, {}),
    };
  }
  return { settings: data, reference: null };
}

function loadFailureMessage(t: Translate, reference: string | null): string {
  return reference
    ? t("admin.settings.language.could_not_load", { reference })
    : t("admin.settings.language.missing_settings", { migration: SETTINGS_MIGRATION });
}

/** Adds 'en' to enabled_languages. No-op if already enabled. */
export async function enableEnglish(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const { settings: current, reference } = await loadSettings(supabase);
  if (!current) return { message: loadFailureMessage(t, reference) };

  // Already in the requested state: revalidating is enough, the button the
  // superadmin clicked disappears on the re-render.
  if (current.enabled_languages.includes("en")) {
    revalidatePath(LANGUAGE_PATH);
    return { ok: true };
  }

  const next: Locale[] = [...current.enabled_languages, "en"];
  const { error } = await supabase
    .from("platform_settings")
    .update({ enabled_languages: next })
    .eq("id", true);
  // Revalidate on failure too, so the badges re-render from the stored row.
  revalidatePath(LANGUAGE_PATH);
  revalidatePath("/admin/settings");

  if (error) {
    const errorReference = reportError(
      "admin.settings.language.enable_english_failed",
      error,
      {},
    );
    return {
      message: t("admin.settings.language.could_not_enable_english", {
        reference: errorReference,
      }),
    };
  }

  return { ok: true };
}

/** Removes 'en' from enabled_languages. Refuses while 'en' is the active
 * language — the DB CHECK would block it too. */
export async function disableEnglish(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const { settings: current, reference } = await loadSettings(supabase);
  if (!current) return { message: loadFailureMessage(t, reference) };

  if (current.active_language === "en") {
    revalidatePath(LANGUAGE_PATH);
    return { message: t("admin.settings.language.english_is_active") };
  }

  const next = current.enabled_languages.filter((l) => l !== "en");
  // Defensive — never empty.
  if (next.length === 0) {
    return { message: t("admin.settings.language.cannot_disable_last") };
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({ enabled_languages: next })
    .eq("id", true);
  revalidatePath(LANGUAGE_PATH);
  revalidatePath("/admin/settings");

  if (error) {
    const errorReference = reportError(
      "admin.settings.language.disable_english_failed",
      error,
      {},
    );
    return {
      message: t("admin.settings.language.could_not_disable_english", {
        reference: errorReference,
      }),
    };
  }

  return { ok: true };
}

/** Sets active_language. Refuses if the target is not in enabled_languages
 * — the DB CHECK enforces this; we pre-validate for a clean UX. */
export async function setActiveLanguage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const raw = String(formData.get("language") ?? "");
  if (raw !== "de" && raw !== "en") return { message: t("validation.generic_error") };

  const { settings: current, reference } = await loadSettings(supabase);
  if (!current) return { message: loadFailureMessage(t, reference) };

  if (!current.enabled_languages.includes(raw)) {
    return { message: t("admin.settings.language.not_enabled") };
  }
  // Already active — the page renders this button for the current language too,
  // so clicking it is a no-op, not something worth reporting.
  if (current.active_language === raw) {
    revalidatePath(LANGUAGE_PATH);
    return { ok: true };
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({ active_language: raw })
    .eq("id", true);
  // Revalidate this page either way so its badges reflect the stored row.
  revalidatePath(LANGUAGE_PATH);

  if (error) {
    const errorReference = reportError(
      "admin.settings.language.set_active_failed",
      error,
      { language: raw },
    );
    return {
      message: t("admin.settings.language.could_not_switch", {
        reference: errorReference,
      }),
    };
  }

  // Only a SUCCESSFUL switch affects every server render, so the whole-layout
  // revalidation stays on this path — doing it after a failed write would
  // rebuild every route to produce identical output.
  revalidatePath("/", "layout");
  return { ok: true };
}

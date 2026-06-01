import Link from "next/link";

import { requireSuperadmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/types/database";

import { disableEnglish, enableEnglish, setActiveLanguage } from "./actions";

export default async function LanguageSettingsPage() {
  const { supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const LABELS: Record<Locale, string> = {
    de: t("admin.settings.language.deutsch"),
    en: t("admin.settings.language.english"),
  };

  const { data } = await supabase
    .from("platform_settings")
    .select("active_language, enabled_languages")
    .eq("id", true)
    .maybeSingle<{ active_language: Locale; enabled_languages: Locale[] }>();

  if (!data) {
    return (
      <div>
        <Link
          href="/admin/settings"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          {t("admin.settings.language.back_to_settings")}
        </Link>
        <div className="mt-3">
          <PageHeader
            title={t("admin.settings.language_card")}
            description={t("admin.settings.language_description")}
          />
        </div>
        <Card>
          <CardContent className="py-10">
            <p className="text-sm text-slate-600">
              {t("admin.settings.language.missing_settings", {
                migration: "0002_platform_settings_and_attempt_language.sql",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const active = data.active_language;
  const enabled = data.enabled_languages;
  const enEnabled = enabled.includes("en");

  return (
    <div>
      <Link
        href="/admin/settings"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t("admin.settings.language.back_to_settings")}
      </Link>
      <div className="mt-3">
        <PageHeader
          title={t("admin.settings.language_card")}
          description={t("admin.settings.language.page_description")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("admin.settings.language.current_state_card")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                {t("admin.settings.language.active_label")}
              </span>
              <Badge tone="success">{LABELS[active]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                {t("admin.settings.language.enabled_label")}
              </span>
              <div className="flex flex-wrap gap-1">
                {enabled.map((l) => (
                  <Badge key={l} tone="neutral">
                    {LABELS[l]}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.settings.language.actions_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-900">
                {t("admin.settings.language.english_section")}
              </p>
              <p className="mb-3 text-xs text-slate-500">
                {enEnabled
                  ? t("admin.settings.language.english_enabled")
                  : t("admin.settings.language.english_dormant")}
              </p>
              {!enEnabled && (
                <ActionButton action={enableEnglish} variant="outline">
                  {t("admin.settings.language.enable_english")}
                </ActionButton>
              )}
              {enEnabled && active === "en" && (
                <p className="text-xs text-slate-400">
                  {t("admin.settings.language.english_is_active")}
                </p>
              )}
              {enEnabled && active !== "en" && (
                <ActionButton
                  action={disableEnglish}
                  variant="outline"
                  confirm={t("admin.settings.language.disable_english_confirm")}
                >
                  {t("admin.settings.language.disable_english")}
                </ActionButton>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-sm font-medium text-slate-900">
                {t("admin.settings.language.active_section")}
              </p>
              <p className="mb-3 text-xs text-slate-500">
                {t("admin.settings.language.active_description")}
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  action={setActiveLanguage}
                  hidden={{ language: "de" }}
                  variant={active === "de" ? "ghost" : "outline"}
                >
                  {active === "de"
                    ? t("admin.settings.language.de_active")
                    : t("admin.settings.language.switch_to_de")}
                </ActionButton>
                {enEnabled && (
                  <ActionButton
                    action={setActiveLanguage}
                    hidden={{ language: "en" }}
                    variant={active === "en" ? "ghost" : "outline"}
                    confirm={
                      active === "en"
                        ? undefined
                        : t("admin.settings.language.switch_en_confirm")
                    }
                  >
                    {active === "en"
                      ? t("admin.settings.language.en_active")
                      : t("admin.settings.language.switch_to_en")}
                  </ActionButton>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

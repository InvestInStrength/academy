import Link from "next/link";

import { requireSuperadmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/types/database";

import { disableEnglish, enableEnglish, setActiveLanguage } from "./actions";

const LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

export default async function LanguageSettingsPage() {
  const { supabase } = await requireSuperadmin();

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
          ← Back to settings
        </Link>
        <div className="mt-3">
          <PageHeader title="Language" description="Multilanguage feature flag." />
        </div>
        <Card>
          <CardContent className="py-10">
            <p className="text-sm text-slate-600">
              Platform settings row is missing. Apply migration{" "}
              <code>0002_platform_settings_and_attempt_language.sql</code>.
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
        ← Back to settings
      </Link>
      <div className="mt-3">
        <PageHeader
          title="Language"
          description="Superadmin-only multilanguage feature flag. The active language drives every candidate-facing surface. In-progress attempts keep the language they started in."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Active:</span>
              <Badge tone="success">{LABELS[active]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Enabled:</span>
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
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-900">
                English (second language)
              </p>
              <p className="mb-3 text-xs text-slate-500">
                {enEnabled
                  ? "English is enabled. Slice 7b will surface a second input alongside DE in admin content forms."
                  : "English is dormant. Enabling it unlocks dual-language inputs and allows switching the active language to English."}
              </p>
              {!enEnabled && (
                <ActionButton action={enableEnglish} variant="outline">
                  Enable English
                </ActionButton>
              )}
              {enEnabled && active === "en" && (
                <p className="text-xs text-slate-400">
                  English is the active language. Switch to Deutsch first to
                  disable it.
                </p>
              )}
              {enEnabled && active !== "en" && (
                <ActionButton
                  action={disableEnglish}
                  variant="outline"
                  confirm="Disable English? Admin forms hide the EN input, but any EN text already stored on records stays in the database."
                >
                  Disable English
                </ActionButton>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-sm font-medium text-slate-900">
                Active language
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Drives every candidate-facing page. In-progress attempts keep
                the language they started in.
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  action={setActiveLanguage}
                  hidden={{ language: "de" }}
                  variant={active === "de" ? "ghost" : "outline"}
                >
                  {active === "de" ? "Deutsch (active)" : "Switch to Deutsch"}
                </ActionButton>
                {enEnabled && (
                  <ActionButton
                    action={setActiveLanguage}
                    hidden={{ language: "en" }}
                    variant={active === "en" ? "ghost" : "outline"}
                    confirm={
                      active === "en"
                        ? undefined
                        : "Switch the entire platform to English? Changes the candidate-facing language for everyone immediately."
                    }
                  >
                    {active === "en" ? "English (active)" : "Switch to English"}
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

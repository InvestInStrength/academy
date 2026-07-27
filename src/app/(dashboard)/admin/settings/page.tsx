import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default async function SettingsPage() {
  const { profile } = await requireAdmin();
  const { t } = await getServerT();
  const isSuperadmin = profile.role === "superadmin";

  return (
    <div>
      <PageHeader
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />

      {isSuperadmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("admin.settings.admins_card")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {t("admin.settings.admins_description")}
            </p>
            <ButtonLink href="/admin/settings/admins" size="sm" variant="outline">
              {t("admin.settings.manage_admins")}
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      {isSuperadmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("admin.settings.language_card")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {t("admin.settings.language_description")}
            </p>
            <ButtonLink
              href="/admin/settings/language"
              size="sm"
              variant="outline"
            >
              {t("admin.settings.manage_language")}
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("admin.settings.templates_card")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {t("admin.settings.templates_description")}
          </p>
          <ButtonLink href="/admin/settings/templates" size="sm" variant="outline">
            {t("admin.settings.manage_templates")}
          </ButtonLink>
        </CardContent>
      </Card>

      <PlaceholderPanel note={t("admin.settings.placeholder")} />
    </div>
  );
}

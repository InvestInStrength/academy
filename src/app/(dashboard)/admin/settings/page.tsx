import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/page-header";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default async function SettingsPage() {
  const { profile } = await requireAdmin();
  const isSuperadmin = profile.role === "superadmin";

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform configuration and certificate templates."
      />

      {isSuperadmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Manage who can access the admin area.
            </p>
            <ButtonLink href="/admin/settings/admins" size="sm" variant="outline">
              Manage admins
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <PlaceholderPanel note="Certificate template management and other settings arrive in a later slice." />
    </div>
  );
}

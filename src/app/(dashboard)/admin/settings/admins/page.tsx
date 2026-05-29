import Link from "next/link";

import { requireSuperadmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import type { AdminProfile } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCreateForm } from "./admin-create-form";
import { setAdminActive, setAdminRole } from "./actions";

export default async function AdminsPage() {
  const { supabase, user } = await requireSuperadmin();

  const { data } = await supabase
    .from("admin_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const admins: AdminProfile[] = data ?? [];

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
          title="Administrators"
          description="Superadmins manage who can access the admin area."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Admins ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium">Role</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Added</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isSelf = admin.id === user.id;
                  return (
                    <tr key={admin.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        {admin.email ?? "—"}
                        {isSelf && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={admin.role === "superadmin" ? "warning" : "neutral"}>
                          {admin.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={admin.active ? "success" : "neutral"}>
                          {admin.active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(admin.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        {isSelf ? (
                          <span className="block text-right text-xs text-slate-400">
                            —
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <ActionButton
                              action={setAdminRole}
                              hidden={{
                                id: admin.id,
                                role: admin.role === "superadmin" ? "admin" : "superadmin",
                              }}
                            >
                              {admin.role === "superadmin" ? "Make admin" : "Make superadmin"}
                            </ActionButton>
                            <ActionButton
                              action={setAdminActive}
                              hidden={{ id: admin.id, active: String(!admin.active) }}
                              variant={admin.active ? "danger" : "outline"}
                              confirm={
                                admin.active
                                  ? `Disable ${admin.email}? They lose admin access immediately.`
                                  : undefined
                              }
                            >
                              {admin.active ? "Disable" : "Enable"}
                            </ActionButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add an admin</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminCreateForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

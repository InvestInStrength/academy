import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { CertificateTemplate } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateForm } from "./template-form";
import { deleteTemplate, toggleTemplateActive } from "./actions";

/**
 * Certificate artwork library. Each course/seminar points at one of these (see
 * the template picker on a course or seminar); with none selected the built-in
 * template for the kind is used.
 */
export default async function CertificateTemplatesPage() {
  const { supabase } = await requireAdmin();
  const { locale, t } = await getServerT();

  const { data } = await supabase
    .from("certificate_templates")
    .select("*")
    .order("created_at", { ascending: false });

  const templates: CertificateTemplate[] = data ?? [];

  // Which courses/seminars use each template, so an admin can see what a change
  // would affect before making it.
  const { data: usage } = await supabase
    .from("courses")
    .select("id, title, kind, certificate_template_id")
    .not("certificate_template_id", "is", null);
  const usedBy = new Map<string, { title: string; kind: string; id: string }[]>();
  for (const row of usage ?? []) {
    if (!row.certificate_template_id) continue;
    const list = usedBy.get(row.certificate_template_id) ?? [];
    list.push({ id: row.id, title: row.title, kind: row.kind });
    usedBy.set(row.certificate_template_id, list);
  }

  return (
    <div>
      <Link
        href="/admin/settings"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t("admin.templates.back")}
      </Link>

      <div className="mt-3">
        <PageHeader
          title={t("admin.templates.title")}
          description={t("admin.templates.description")}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("admin.templates.create_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.templates.list_title", { count: templates.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              {t("admin.templates.empty")}
            </p>
          ) : (
            templates.map((template) => {
              const users = usedBy.get(template.id) ?? [];
              return (
                <div
                  key={template.id}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-400">
                        {t("admin.templates.created_at", {
                          date: formatDate(template.created_at, locale),
                        })}
                      </p>
                    </div>
                    <Badge tone={template.active ? "success" : "neutral"}>
                      {template.active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {t("admin.templates.used_by")}
                    </p>
                    {users.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        {t("admin.templates.used_by_none")}
                      </p>
                    ) : (
                      <ul className="text-sm text-slate-700">
                        {users.map((user) => (
                          <li key={user.id}>
                            <Link
                              href={`${
                                user.kind === "seminar"
                                  ? "/admin/seminars"
                                  : "/admin/courses"
                              }/${user.id}`}
                              className="text-brand-700 hover:underline"
                            >
                              {user.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <details>
                    <summary className="cursor-pointer text-sm text-brand-700 hover:underline">
                      {t("admin.templates.edit")}
                    </summary>
                    <div className="mt-3 rounded-md border border-slate-100 p-3">
                      <TemplateForm template={template} />
                    </div>
                  </details>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <ActionButton
                      action={toggleTemplateActive}
                      hidden={{ id: template.id, active: String(!template.active) }}
                    >
                      {template.active
                        ? t("common.deactivate")
                        : t("common.activate")}
                    </ActionButton>
                    <GuardedDeleteButton
                      action={deleteTemplate}
                      hidden={{ id: template.id }}
                      confirm={t("admin.templates.delete_confirm", {
                        name: template.name,
                      })}
                    >
                      {t("common.delete")}
                    </GuardedDeleteButton>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

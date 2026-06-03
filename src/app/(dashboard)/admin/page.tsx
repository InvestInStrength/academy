import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

async function countRows(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "courses" | "questions" | "questionnaires" | "participants",
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const [courses, questions, questionnaires, participants] = await Promise.all([
    countRows(supabase, "courses"),
    countRows(supabase, "questions"),
    countRows(supabase, "questionnaires"),
    countRows(supabase, "participants"),
  ]);

  const stats = [
    { label: t("nav.courses"), value: courses, href: "/admin/courses" },
    { label: t("nav.questions"), value: questions, href: "/admin/questions" },
    {
      label: t("nav.questionnaires"),
      value: questionnaires,
      href: "/admin/questionnaires",
    },
    { label: t("nav.participants"), value: participants, href: "/admin/participants" },
  ];

  return (
    <div>
      <PageHeader
        title={t("admin.dashboard.title")}
        description={t("admin.dashboard.description")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Card className="transition-colors hover:border-brand-200 hover:bg-brand-50/40">
              <CardContent>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            {t("admin.dashboard.get_started")}
          </span>
          <ButtonLink href="/admin/courses" size="sm" variant="outline">
            {t("admin.dashboard.manage_courses")}
          </ButtonLink>
          <ButtonLink href="/admin/questions" size="sm" variant="outline">
            {t("admin.dashboard.build_questions")}
          </ButtonLink>
          <ButtonLink href="/admin/questionnaires" size="sm" variant="outline">
            {t("admin.dashboard.create_questionnaire")}
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}

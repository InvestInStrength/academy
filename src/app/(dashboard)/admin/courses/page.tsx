import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Course } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "./course-form";
import { toggleCourseActive } from "./actions";

export default async function CoursesPage() {
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const courses: Course[] = data ?? [];

  const introSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    n,
    title: t(`admin.courses.intro.step${n}.title`),
    body: t(`admin.courses.intro.step${n}.body`),
  }));

  return (
    <div>
      <PageHeader
        title={t("admin.courses.title")}
        description={t("admin.courses.description")}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("admin.courses.list_title", { count: courses.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                {t("admin.courses.empty")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-medium">{t("admin.courses.col_title")}</th>
                    <th className="px-5 py-2 font-medium">{t("admin.courses.col_status")}</th>
                    <th className="px-5 py-2 font-medium">{t("admin.courses.col_created")}</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {pickLocalized(course, "title", locale) ?? course.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={course.active ? "success" : "neutral"}>
                          {course.active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(course.created_at, locale)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <ActionButton
                            action={toggleCourseActive}
                            hidden={{ id: course.id, active: String(!course.active) }}
                          >
                            {course.active ? t("common.deactivate") : t("common.activate")}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("admin.courses.create_card_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm showEnglish={showEnglish} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("admin.courses.intro.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("admin.courses.intro.description")}
          </p>
          <ol className="space-y-3">
            {introSteps.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

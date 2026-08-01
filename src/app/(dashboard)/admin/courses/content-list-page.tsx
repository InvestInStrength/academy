import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Course, CourseKind } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "./course-form";
import { toggleCourseActive } from "./actions";
import { basePathFor, messagePrefixFor, loadTemplateOptions } from "./shared";

/**
 * The list + create screen for one certification kind. Courses and seminars are
 * the same `courses` rows and use the same CRUD; only the copy, the extra event
 * date column and the route differ — so both /admin/courses and /admin/seminars
 * render this component rather than keeping two near-identical pages in sync.
 */
export async function ContentListPage({ kind }: { kind: CourseKind }) {
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

  const [{ data }, templates] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("kind", kind)
      .order("created_at", { ascending: false }),
    loadTemplateOptions(supabase),
  ]);

  const courses: Course[] = data ?? [];
  const isSeminar = kind === "seminar";
  const p = messagePrefixFor(kind);
  const basePath = basePathFor(kind);

  const introSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    n,
    title: t(`${p}.intro.step${n}.title`),
    body: t(`${p}.intro.step${n}.body`),
  }));

  return (
    <div>
      <PageHeader title={t(`${p}.title`)} description={t(`${p}.description`)} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {t(`${p}.list_title`, { count: courses.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                {t(`${p}.empty`)}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2 font-medium">{t(`${p}.col_title`)}</th>
                      {isSeminar && (
                        <th className="px-5 py-2 font-medium">
                          {t("admin.seminars.col_event_date")}
                        </th>
                      )}
                      <th className="px-5 py-2 font-medium">{t(`${p}.col_status`)}</th>
                      <th className="px-5 py-2 font-medium">{t(`${p}.col_created`)}</th>
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
                            href={`${basePath}/${course.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {pickLocalized(course, "title", locale) ?? course.title}
                          </Link>
                        </td>
                        {isSeminar && (
                          <td className="px-5 py-3 text-slate-500">
                            {course.event_date
                              ? formatDate(course.event_date, locale)
                              : "—"}
                          </td>
                        )}
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
                              // `kind` travels with the click so a failure is
                              // reported in this section's own wording.
                              hidden={{
                                id: course.id,
                                active: String(!course.active),
                                kind,
                              }}
                            >
                              {course.active
                                ? t("common.deactivate")
                                : t("common.activate")}
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t(`${p}.create_card_title`)}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm
              kind={kind}
              templates={templates}
              showEnglish={showEnglish}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t(`${p}.intro.title`)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{t(`${p}.intro.description`)}</p>
          <ol className="space-y-3">
            {introSteps.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{step.title}</p>
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

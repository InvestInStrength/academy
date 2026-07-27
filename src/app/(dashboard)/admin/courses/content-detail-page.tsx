import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import { formatLongDate } from "@/lib/utils";
import type { Course, CourseKind, CourseTopic } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { CourseForm } from "./course-form";
import { deleteCourse } from "./actions";
import { basePathFor, messagePrefixFor, loadTemplateOptions } from "./shared";
import { TopicsSection } from "./[courseId]/topics-section";

/**
 * The detail screen for one certification kind, shared by /admin/courses/[id]
 * and /admin/seminars/[id]. Both keep the topics section: a seminar's topics
 * are never printed on its certificate, but they still group its questions and
 * drive the learning recommendations shown after a failed attempt.
 *
 * A record is only reachable under its own section — opening a seminar id under
 * /admin/courses (or vice versa) 404s, so the two lists stay honest.
 */
export async function ContentDetailPage({
  kind,
  id,
}: {
  kind: CourseKind;
  id: string;
}) {
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("kind", kind)
    .maybeSingle<Course>();

  if (!course) {
    notFound();
  }

  const [{ data: topicData }, templates] = await Promise.all([
    supabase
      .from("course_topics")
      .select("*")
      .eq("course_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    loadTemplateOptions(supabase, course.certificate_template_id),
  ]);

  const topics: CourseTopic[] = topicData ?? [];
  const localizedTitle = pickLocalized(course, "title", locale) ?? course.title;
  const p = messagePrefixFor(kind);

  const description =
    kind === "seminar" && course.event_date
      ? t("admin.seminars.detail_description_dated", {
          date: formatLongDate(course.event_date, locale),
        })
      : t(`${p}.detail_description`);

  return (
    <div>
      <Link
        href={basePathFor(kind)}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t(`${p}.detail_back`)}
      </Link>

      <div className="mt-3">
        <PageHeader title={localizedTitle} description={description} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t(`${p}.details_card`)}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm
              course={course}
              kind={kind}
              templates={templates}
              showEnglish={showEnglish}
            />
          </CardContent>
        </Card>

        <TopicsSection
          courseId={course.id}
          topics={topics}
          locale={locale}
          showEnglish={showEnglish}
          kind={kind}
        />
      </div>

      <Card className="mt-6 border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">{t("common.danger_zone")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{t(`${p}.delete_warning`)}</p>
          <GuardedDeleteButton
            action={deleteCourse}
            hidden={{ id: course.id }}
            confirm={t(`${p}.delete_confirm`, { title: localizedTitle })}
          >
            {t(`${p}.delete_button`)}
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

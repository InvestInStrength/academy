import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Course, CourseTopic } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { CourseForm } from "../course-form";
import { deleteCourse } from "../actions";
import { TopicsSection } from "./topics-section";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle<Course>();

  if (!course) {
    notFound();
  }

  const { data: topicData } = await supabase
    .from("course_topics")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const topics: CourseTopic[] = topicData ?? [];
  const localizedTitle = pickLocalized(course, "title", locale) ?? course.title;

  return (
    <div>
      <Link
        href="/admin/courses"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t("admin.courses.detail_back")}
      </Link>

      <div className="mt-3">
        <PageHeader
          title={localizedTitle}
          description={t("admin.courses.detail_description")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("admin.courses.details_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm course={course} showEnglish={showEnglish} />
          </CardContent>
        </Card>

        <TopicsSection
          courseId={course.id}
          topics={topics}
          locale={locale}
          showEnglish={showEnglish}
        />
      </div>

      <Card className="mt-6 border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">{t("common.danger_zone")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {t("admin.courses.delete_warning")}
          </p>
          <GuardedDeleteButton
            action={deleteCourse}
            hidden={{ id: course.id }}
            confirm={t("admin.courses.delete_confirm", { title: localizedTitle })}
          >
            {t("admin.courses.delete_button")}
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

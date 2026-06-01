import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getActiveLanguage, isEnglishEnabled } from "@/lib/i18n";
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
  const [locale, showEnglish] = await Promise.all([
    getActiveLanguage(),
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
        ← Back to courses
      </Link>

      <div className="mt-3">
        <PageHeader title={localizedTitle} description="Edit course and manage topics." />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Course details</CardTitle>
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
          <CardTitle className="text-red-700">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Deleting is permanent and only allowed when the course has no
            questions or questionnaires. Otherwise deactivate it.
          </p>
          <GuardedDeleteButton
            action={deleteCourse}
            hidden={{ id: course.id }}
            confirm={`Delete "${localizedTitle}"?`}
          >
            Delete course
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

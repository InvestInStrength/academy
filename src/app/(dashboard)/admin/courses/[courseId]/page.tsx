import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
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

  return (
    <div>
      <Link
        href="/admin/courses"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to courses
      </Link>

      <div className="mt-3">
        <PageHeader title={course.title} description="Edit course and manage topics." />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Course details</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm course={course} />
          </CardContent>
        </Card>

        <TopicsSection courseId={course.id} topics={topics} />
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
            confirm={`Delete "${course.title}"?`}
          >
            Delete course
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

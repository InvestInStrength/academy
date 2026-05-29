import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import type { Course, CourseTopic } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionForm } from "../question-form";

export default async function NewQuestionPage() {
  const { supabase } = await requireAdmin();

  const [{ data: courseData }, { data: topicData }] = await Promise.all([
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("course_topics").select("id, title, course_id").order("sort_order"),
  ]);

  const courses = (courseData ?? []) as Pick<Course, "id" | "title">[];
  const topics = (topicData ?? []) as Pick<
    CourseTopic,
    "id" | "title" | "course_id"
  >[];

  return (
    <div>
      <Link
        href="/admin/questions"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to question bank
      </Link>
      <div className="mt-3">
        <PageHeader title="New question" />
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Create a course first before adding questions.
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardContent>
            <QuestionForm courses={courses} topics={topics} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

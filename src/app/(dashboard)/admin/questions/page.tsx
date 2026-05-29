import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import type { Course, CourseTopic, Question } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { toggleQuestionActive } from "./actions";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseFilter } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: courseData }, { data: topicData }] = await Promise.all([
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("course_topics").select("id, title, course_id"),
  ]);

  const courses = (courseData ?? []) as Pick<Course, "id" | "title">[];
  const topics = (topicData ?? []) as Pick<
    CourseTopic,
    "id" | "title" | "course_id"
  >[];

  let query = supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });
  if (courseFilter) {
    query = query.eq("course_id", courseFilter);
  }
  const { data: questionData } = await query;
  const questions: Question[] = questionData ?? [];

  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const topicTitle = new Map(topics.map((t) => [t.id, t.title]));

  return (
    <div>
      <PageHeader
        title="Question Bank"
        description="Reusable questions. Each belongs to a course and (optionally) a topic."
        actions={
          <ButtonLink href="/admin/questions/new">New question</ButtonLink>
        }
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Questions ({questions.length})</CardTitle>
          <form method="get" className="flex items-center gap-2">
            <Select name="course" defaultValue={courseFilter ?? ""} className="w-56">
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Filter
            </button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No questions yet.{" "}
              <Link href="/admin/questions/new" className="text-brand-700 hover:underline">
                Create your first question
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Question</th>
                  <th className="px-5 py-2 font-medium">Course / Topic</th>
                  <th className="px-5 py-2 font-medium">Type</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="max-w-md px-5 py-3">
                      <Link
                        href={`/admin/questions/${question.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {question.question_text.length > 90
                          ? `${question.question_text.slice(0, 90)}…`
                          : question.question_text}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <div>{courseTitle.get(question.course_id) ?? "—"}</div>
                      {question.topic_id && (
                        <div className="text-xs text-slate-400">
                          {topicTitle.get(question.topic_id) ?? "—"}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {question.question_type === "single_choice"
                        ? "Single"
                        : "Multiple"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={question.active ? "success" : "neutral"}>
                        {question.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={toggleQuestionActive}
                          hidden={{ id: question.id, active: String(!question.active) }}
                        >
                          {question.active ? "Deactivate" : "Activate"}
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
    </div>
  );
}

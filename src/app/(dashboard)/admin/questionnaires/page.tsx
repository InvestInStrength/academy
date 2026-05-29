import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import type { Course, Questionnaire } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleQuestionnaireActive } from "./actions";

export default async function QuestionnairesPage() {
  const { supabase } = await requireAdmin();

  const [{ data: qData }, { data: courseData }, { data: qqData }] =
    await Promise.all([
      supabase
        .from("questionnaires")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title"),
      supabase.from("questionnaire_questions").select("questionnaire_id"),
    ]);

  const questionnaires: Questionnaire[] = qData ?? [];
  const courses = (courseData ?? []) as Pick<Course, "id" | "title">[];
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));

  const questionCount = new Map<string, number>();
  for (const row of qqData ?? []) {
    questionCount.set(
      row.questionnaire_id,
      (questionCount.get(row.questionnaire_id) ?? 0) + 1,
    );
  }

  return (
    <div>
      <PageHeader
        title="Questionnaires"
        description="Configured assessments. Passing threshold and shuffle behaviour are per questionnaire."
        actions={
          <ButtonLink href="/admin/questionnaires/new">
            New questionnaire
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All questionnaires ({questionnaires.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {questionnaires.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No questionnaires yet.{" "}
              <Link href="/admin/questionnaires/new" className="text-brand-700 hover:underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Title</th>
                  <th className="px-5 py-2 font-medium">Course</th>
                  <th className="px-5 py-2 font-medium">Pass</th>
                  <th className="px-5 py-2 font-medium">Questions</th>
                  <th className="px-5 py-2 font-medium">Shuffle</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {questionnaires.map((questionnaire) => (
                  <tr key={questionnaire.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/questionnaires/${questionnaire.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {questionnaire.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {courseTitle.get(questionnaire.course_id) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {questionnaire.passing_percentage}%
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {questionCount.get(questionnaire.id) ?? 0}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {questionnaire.randomize_question_order && (
                          <Badge tone="neutral">Q</Badge>
                        )}
                        {questionnaire.randomize_answer_order && (
                          <Badge tone="neutral">A</Badge>
                        )}
                        {!questionnaire.randomize_question_order &&
                          !questionnaire.randomize_answer_order && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={questionnaire.active ? "success" : "neutral"}>
                        {questionnaire.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={toggleQuestionnaireActive}
                          hidden={{
                            id: questionnaire.id,
                            active: String(!questionnaire.active),
                          }}
                        >
                          {questionnaire.active ? "Deactivate" : "Activate"}
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

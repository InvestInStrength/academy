import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import type { Course, Question, Questionnaire } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { QuestionnaireForm } from "../questionnaire-form";
import { deleteQuestionnaire } from "../actions";

export default async function EditQuestionnairePage({
  params,
}: {
  params: Promise<{ questionnaireId: string }>;
}) {
  const { questionnaireId } = await params;
  const { supabase } = await requireAdmin();

  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("id", questionnaireId)
    .maybeSingle<Questionnaire>();

  if (!questionnaire) {
    notFound();
  }

  const [{ data: courseData }, { data: questionData }, { data: qqData }] =
    await Promise.all([
      supabase.from("courses").select("id, title").order("title"),
      supabase
        .from("questions")
        .select("id, question_text, course_id, active")
        .order("created_at"),
      supabase
        .from("questionnaire_questions")
        .select("question_id, sort_order")
        .eq("questionnaire_id", questionnaireId)
        .order("sort_order"),
    ]);

  const courses = (courseData ?? []) as Pick<Course, "id" | "title">[];
  const questions = (questionData ?? []) as Pick<
    Question,
    "id" | "question_text" | "course_id" | "active"
  >[];
  const initialQuestionIds = (qqData ?? []).map((row) => row.question_id);

  return (
    <div>
      <Link
        href="/admin/questionnaires"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to questionnaires
      </Link>
      <div className="mt-3">
        <PageHeader title={questionnaire.title} description="Edit questionnaire settings and questions." />
      </div>

      <Card className="max-w-3xl">
        <CardContent>
          <QuestionnaireForm
            courses={courses}
            questions={questions}
            questionnaire={questionnaire}
            initialQuestionIds={initialQuestionIds}
          />
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-3xl border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Delete is only allowed when the questionnaire has no certification
            assignments. Otherwise deactivate it.
          </p>
          <GuardedDeleteButton
            action={deleteQuestionnaire}
            hidden={{ id: questionnaire.id }}
            confirm={`Delete "${questionnaire.title}"?`}
          >
            Delete questionnaire
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

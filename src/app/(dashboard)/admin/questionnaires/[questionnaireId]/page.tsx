import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Question, Questionnaire } from "@/types/database";
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
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

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
      supabase
        .from("courses")
        .select("id, title, title_de, title_en")
        .order("title"),
      supabase
        .from("questions")
        .select(
          "id, question_text, question_text_de, question_text_en, course_id, active",
        )
        .order("created_at"),
      supabase
        .from("questionnaire_questions")
        .select("question_id, sort_order")
        .eq("questionnaire_id", questionnaireId)
        .order("sort_order"),
    ]);

  const courses = (courseData ?? []).map((c) => ({
    id: c.id,
    title: pickLocalized(c, "title", locale) ?? c.title,
  }));
  const questions = (questionData ?? []).map((q) => ({
    id: q.id,
    question_text:
      pickLocalized(q, "question_text", locale) ?? q.question_text,
    course_id: q.course_id,
    active: q.active,
  })) as Pick<Question, "id" | "question_text" | "course_id" | "active">[];
  const initialQuestionIds = (qqData ?? []).map((row) => row.question_id);
  const localizedQTitle =
    pickLocalized(questionnaire, "title", locale) ?? questionnaire.title;

  return (
    <div>
      <Link
        href="/admin/questionnaires"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t("admin.questionnaires.back")}
      </Link>
      <div className="mt-3">
        <PageHeader
          title={localizedQTitle}
          description={t("admin.questionnaires.edit_description")}
        />
      </div>

      <Card className="max-w-3xl">
        <CardContent>
          <QuestionnaireForm
            courses={courses}
            questions={questions}
            questionnaire={questionnaire}
            initialQuestionIds={initialQuestionIds}
            showEnglish={showEnglish}
          />
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-3xl border-red-100">
        <CardHeader>
          <CardTitle className="text-red-700">{t("common.danger_zone")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {t("admin.questionnaires.delete_warning")}
          </p>
          <GuardedDeleteButton
            action={deleteQuestionnaire}
            hidden={{ id: questionnaire.id }}
            confirm={t("admin.questionnaires.delete_confirm", { title: localizedQTitle })}
          >
            {t("admin.questionnaires.delete_button")}
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

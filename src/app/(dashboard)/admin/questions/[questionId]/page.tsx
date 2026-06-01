import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Question, QuestionOption } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { QuestionForm } from "../question-form";
import { deleteQuestion } from "../actions";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
    isEnglishEnabled(),
  ]);

  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle<Question>();

  if (!question) {
    notFound();
  }

  const [{ data: courseData }, { data: topicData }, { data: optionData }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, title, title_de, title_en")
        .order("title"),
      supabase
        .from("course_topics")
        .select("id, title, title_de, title_en, course_id")
        .order("sort_order"),
      supabase
        .from("question_options")
        .select("*")
        .eq("question_id", questionId)
        .order("sort_order"),
    ]);

  const courses = (courseData ?? []).map((c) => ({
    id: c.id,
    title: pickLocalized(c, "title", locale) ?? c.title,
  }));
  const topics = (topicData ?? []).map((t) => ({
    id: t.id,
    title: pickLocalized(t, "title", locale) ?? t.title,
    course_id: t.course_id,
  }));
  const options: QuestionOption[] = optionData ?? [];

  return (
    <div>
      <Link
        href="/admin/questions"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        {t("admin.questions.back")}
      </Link>
      <div className="mt-3">
        <PageHeader title={t("admin.questions.edit_page_title")} />
      </div>

      <Card className="max-w-3xl">
        <CardContent>
          <QuestionForm
            courses={courses}
            topics={topics}
            question={question}
            initialOptions={options}
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
            {t("admin.questions.delete_warning")}
          </p>
          <GuardedDeleteButton
            action={deleteQuestion}
            hidden={{ id: question.id }}
            confirm={t("admin.questions.delete_confirm")}
          >
            {t("admin.questions.delete_button")}
          </GuardedDeleteButton>
        </CardContent>
      </Card>
    </div>
  );
}

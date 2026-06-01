import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getActiveLanguage, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Question } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionnaireForm } from "../questionnaire-form";

export default async function NewQuestionnairePage() {
  const { supabase } = await requireAdmin();
  const [locale, showEnglish] = await Promise.all([
    getActiveLanguage(),
    isEnglishEnabled(),
  ]);

  const [{ data: courseData }, { data: questionData }] = await Promise.all([
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

  return (
    <div>
      <Link
        href="/admin/questionnaires"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to questionnaires
      </Link>
      <div className="mt-3">
        <PageHeader title="New questionnaire" />
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Create a course and some questions first.
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardContent>
            <QuestionnaireForm
              courses={courses}
              questions={questions}
              showEnglish={showEnglish}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

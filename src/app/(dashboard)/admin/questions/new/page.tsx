import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getActiveLanguage, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionForm } from "../question-form";

export default async function NewQuestionPage() {
  const { supabase } = await requireAdmin();
  const [locale, showEnglish] = await Promise.all([
    getActiveLanguage(),
    isEnglishEnabled(),
  ]);

  const [{ data: courseData }, { data: topicData }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, title_de, title_en")
      .order("title"),
    supabase
      .from("course_topics")
      .select("id, title, title_de, title_en, course_id")
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
            <QuestionForm
              courses={courses}
              topics={topics}
              showEnglish={showEnglish}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

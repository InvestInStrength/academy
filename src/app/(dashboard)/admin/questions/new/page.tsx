import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT, isEnglishEnabled } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionForm } from "../question-form";

export default async function NewQuestionPage() {
  const { supabase } = await requireAdmin();
  const [{ locale, t }, showEnglish] = await Promise.all([
    getServerT(),
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
        {t("admin.questions.back")}
      </Link>
      <div className="mt-3">
        <PageHeader title={t("admin.questions.new_page_title")} />
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            {t("admin.questions.no_courses_yet")}
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

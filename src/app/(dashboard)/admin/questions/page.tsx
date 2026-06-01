import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Question } from "@/types/database";
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
  const { locale, t } = await getServerT();

  const [{ data: courseData }, { data: topicData }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, title_de, title_en")
      .order("title"),
    supabase.from("course_topics").select("id, title, title_de, title_en, course_id"),
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
        title={t("admin.questions.title")}
        description={t("admin.questions.description")}
        actions={
          <ButtonLink href="/admin/questions/new">{t("admin.questions.new_button")}</ButtonLink>
        }
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("admin.questions.list_title", { count: questions.length })}</CardTitle>
          <form method="get" className="flex items-center gap-2">
            <Select name="course" defaultValue={courseFilter ?? ""} className="w-56">
              <option value="">{t("admin.questions.all_courses")}</option>
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
              {t("common.filter")}
            </button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              {t("admin.questions.empty")}{" "}
              <Link href="/admin/questions/new" className="text-brand-700 hover:underline">
                {t("admin.questions.empty_link")}
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">{t("admin.questions.col_question")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questions.col_course_topic")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questions.col_type")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questions.col_status")}</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => {
                  const localizedText =
                    pickLocalized(question, "question_text", locale) ??
                    question.question_text;
                  return (
                  <tr key={question.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="max-w-md px-5 py-3">
                      <Link
                        href={`/admin/questions/${question.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {localizedText.length > 90
                          ? `${localizedText.slice(0, 90)}…`
                          : localizedText}
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
                        ? t("admin.questions.type_single")
                        : t("admin.questions.type_multiple")}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={question.active ? "success" : "neutral"}>
                        {question.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={toggleQuestionActive}
                          hidden={{ id: question.id, active: String(!question.active) }}
                        >
                          {question.active ? t("common.deactivate") : t("common.activate")}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

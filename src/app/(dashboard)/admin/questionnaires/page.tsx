import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type { Questionnaire } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleQuestionnaireActive } from "./actions";

export default async function QuestionnairesPage() {
  const { supabase } = await requireAdmin();
  const { locale, t } = await getServerT();

  const [{ data: qData }, { data: courseData }, { data: qqData }] =
    await Promise.all([
      supabase
        .from("questionnaires")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title, title_de, title_en, kind"),
      supabase.from("questionnaire_questions").select("questionnaire_id"),
    ]);

  const questionnaires: Questionnaire[] = qData ?? [];
  const courseTitle = new Map(
    (courseData ?? []).map((c) => [
      c.id,
      pickLocalized(c, "title", locale) ?? c.title,
    ]),
  );
  // Tests hang off a course OR a seminar; mark the latter so the list is
  // unambiguous when both kinds share similar titles.
  const courseKind = new Map((courseData ?? []).map((c) => [c.id, c.kind]));

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
        title={t("admin.questionnaires.title")}
        description={t("admin.questionnaires.description")}
        actions={
          <ButtonLink href="/admin/questionnaires/new">
            {t("admin.questionnaires.new_button")}
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.questionnaires.list_title", { count: questionnaires.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {questionnaires.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              {t("admin.questionnaires.empty")}{" "}
              <Link href="/admin/questionnaires/new" className="text-brand-700 hover:underline">
                {t("admin.questionnaires.empty_link")}
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_title")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_course")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_pass")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_questions")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_shuffle")}</th>
                  <th className="px-5 py-2 font-medium">{t("admin.questionnaires.col_status")}</th>
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
                        {pickLocalized(questionnaire, "title", locale) ??
                          questionnaire.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {courseTitle.get(questionnaire.course_id) ?? "—"}
                      {courseKind.get(questionnaire.course_id) === "seminar" && (
                        <Badge tone="neutral" className="ml-2">
                          {t("common.seminar")}
                        </Badge>
                      )}
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
                        {questionnaire.active ? t("common.active") : t("common.inactive")}
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
                          {questionnaire.active ? t("common.deactivate") : t("common.activate")}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

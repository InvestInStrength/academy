import { getDictionary, t as rawT } from "@/lib/i18n/dict";
import { pickLocalized } from "@/lib/i18n/content";
import type { CourseKind, CourseTopic, Locale } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/admin/action-button";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { TopicForm } from "./topic-form";
import { deleteTopic, toggleTopicActive } from "./topic-actions";

type Props = {
  courseId: string;
  topics: CourseTopic[];
  locale: Locale;
  showEnglish?: boolean;
  kind?: CourseKind;
};

export function TopicsSection({
  courseId,
  topics,
  locale,
  showEnglish = false,
  kind = "course",
}: Props) {
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) =>
    rawT(dict, key, params);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.topics.add_card")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* A seminar's topics group its questions and drive the learning
              recommendations after a failed attempt, but are never printed on
              its certificate — say so where an admin would otherwise assume the
              course behaviour. */}
          {kind === "seminar" && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t("admin.topics.seminar_hint")}
            </p>
          )}
          <TopicForm courseId={courseId} showEnglish={showEnglish} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.topics.list_title", { count: topics.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topics.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              {t("admin.topics.empty")}
            </p>
          ) : (
            topics.map((topic) => {
              const localizedTopicTitle =
                pickLocalized(topic, "title", locale) ?? topic.title;
              return (
                <div
                  key={topic.id}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone={topic.active ? "success" : "neutral"}>
                      {topic.active ? t("common.active") : t("common.inactive")}
                    </Badge>
                    {topic.code && (
                      <span className="text-xs font-medium text-slate-400">
                        {topic.code}
                      </span>
                    )}
                  </div>

                  <TopicForm
                    courseId={courseId}
                    topic={topic}
                    showEnglish={showEnglish}
                  />

                  <div className="mt-3 flex items-start justify-end gap-2 border-t border-slate-100 pt-3">
                    <ActionButton
                      action={toggleTopicActive}
                      hidden={{
                        id: topic.id,
                        course_id: courseId,
                        active: String(!topic.active),
                      }}
                    >
                      {topic.active ? t("common.deactivate") : t("common.activate")}
                    </ActionButton>
                    <GuardedDeleteButton
                      action={deleteTopic}
                      hidden={{ id: topic.id, course_id: courseId }}
                      confirm={t("admin.topics.delete_confirm", { title: localizedTopicTitle })}
                    >
                      {t("common.delete")}
                    </GuardedDeleteButton>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { pickLocalized } from "@/lib/i18n/content";
import type { CourseTopic, Locale } from "@/types/database";
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
};

export function TopicsSection({
  courseId,
  topics,
  locale,
  showEnglish = false,
}: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a topic</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicForm courseId={courseId} showEnglish={showEnglish} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topics ({topics.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topics.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No topics yet. Add one above. Topics drive the learning
              recommendations shown to candidates who do not pass.
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
                      {topic.active ? "Active" : "Inactive"}
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
                      {topic.active ? "Deactivate" : "Activate"}
                    </ActionButton>
                    <GuardedDeleteButton
                      action={deleteTopic}
                      hidden={{ id: topic.id, course_id: courseId }}
                      confirm={`Delete topic "${localizedTopicTitle}"?`}
                    >
                      Delete
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

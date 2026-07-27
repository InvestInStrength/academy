"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";

import type { CourseKind } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAssignment } from "../actions";

type QuestionnaireOption = {
  id: string;
  title: string;
  course_id: string;
  /** Kind of the questionnaire's course. A seminar certificate never lists
   * topics, so the picker below is pointless for one and is hidden. */
  kind: CourseKind;
};
type TopicOption = { id: string; title: string; course_id: string };

type Props = {
  participantId: string;
  participantEmail: string | null;
  questionnaires: QuestionnaireOption[];
  topics: TopicOption[];
};

export function AssignmentCreateForm({
  participantId,
  participantEmail,
  questionnaires,
  topics,
}: Props) {
  const [state, formAction] = useActionState(createAssignment, emptyFormState);
  const t = useT();
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedQuestionnaire = useMemo(
    () => questionnaires.find((q) => q.id === questionnaireId),
    [questionnaires, questionnaireId],
  );
  const courseId = selectedQuestionnaire?.course_id ?? "";
  const isSeminar = selectedQuestionnaire?.kind === "seminar";
  const courseTopics = useMemo(
    () => topics.filter((topic) => topic.course_id === courseId),
    [topics, courseId],
  );

  // Preserve the topic-list order in the serialized selection.
  const orderedSelected = courseTopics
    .filter((topic) => selected.has(topic.id))
    .map((topic) => topic.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Confirm before creating, and make the email side effect explicit: with an
  // email on file the candidate is invited immediately; without one, none is
  // sent. Aborting the submit leaves the form untouched.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const message = participantEmail
      ? t("admin.assignments.create_send_confirm", { email: participantEmail })
      : t("admin.assignments.create_no_email_confirm");
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="participant_id" value={participantId} />
      <input type="hidden" name="topic_ids" value={JSON.stringify(orderedSelected)} />

      <Field
        label={t("admin.assignments.questionnaire_label")}
        htmlFor="questionnaire_id"
        required
        error={state.fieldErrors?.questionnaire_id}
      >
        <Select
          id="questionnaire_id"
          name="questionnaire_id"
          value={questionnaireId}
          onChange={(event) => {
            setQuestionnaireId(event.target.value);
            setSelected(new Set());
          }}
          required
        >
          <option value="">{t("admin.assignments.select_questionnaire")}</option>
          {questionnaires.map((questionnaire) => (
            <option key={questionnaire.id} value={questionnaire.id}>
              {questionnaire.title}
            </option>
          ))}
        </Select>
      </Field>

      {isSeminar ? null : (
      <div className="space-y-2">
        <Label>
          {t("admin.assignments.certificate_topics")} ({orderedSelected.length})
        </Label>
        {!questionnaireId ? (
          <p className="text-xs text-slate-500">
            {t("admin.assignments.select_questionnaire_hint")}
          </p>
        ) : courseTopics.length === 0 ? (
          <p className="text-xs text-slate-500">
            {t("admin.assignments.course_no_topics")}
          </p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
            {courseTopics.map((topic) => (
              <li key={topic.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.has(topic.id)}
                    onChange={() => toggle(topic.id)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  {topic.title}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText={t("admin.assignments.creating")}>
        {t("admin.assignments.create_button")}
      </SubmitButton>
    </form>
  );
}

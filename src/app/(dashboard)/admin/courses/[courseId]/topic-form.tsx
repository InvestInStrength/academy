"use client";

import { useActionState, useEffect, useRef } from "react";

import type { CourseTopic } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTopic, updateTopic } from "./topic-actions";

type Props = {
  courseId: string;
  topic?: CourseTopic;
  showEnglish?: boolean;
};

export function TopicForm({ courseId, topic, showEnglish = false }: Props) {
  const isEdit = Boolean(topic);
  const t = useT();
  const [state, formAction] = useActionState(
    isEdit ? updateTopic : createTopic,
    emptyFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && !isEdit) {
      formRef.current?.reset();
    }
  }, [state, isEdit]);

  const idSuffix = topic?.id ?? "new";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      {isEdit && <input type="hidden" name="id" value={topic!.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_140px_90px]">
        <Field
          label={
            showEnglish
              ? t("admin.forms.field.topic_title_de")
              : t("admin.forms.field.topic_title")
          }
          htmlFor={`title-${idSuffix}`}
          required
          error={state.fieldErrors?.title}
        >
          <Input
            id={`title-${idSuffix}`}
            name="title"
            defaultValue={topic?.title ?? ""}
            required
            maxLength={200}
          />
        </Field>
        <Field
          label={t("admin.forms.field.code")}
          htmlFor={`code-${idSuffix}`}
          error={state.fieldErrors?.code}
        >
          <Input
            id={`code-${idSuffix}`}
            name="code"
            defaultValue={topic?.code ?? ""}
            maxLength={50}
            placeholder="e.g. T1"
          />
        </Field>
        <Field
          label={t("admin.forms.field.order")}
          htmlFor={`order-${idSuffix}`}
          error={state.fieldErrors?.sort_order}
        >
          <Input
            id={`order-${idSuffix}`}
            name="sort_order"
            type="number"
            min={0}
            defaultValue={topic?.sort_order ?? 0}
          />
        </Field>
      </div>

      {showEnglish && (
        <Field
          label={t("admin.forms.field.topic_title_en")}
          htmlFor={`title-en-${idSuffix}`}
          error={state.fieldErrors?.title_en}
        >
          <Input
            id={`title-en-${idSuffix}`}
            name="title_en"
            defaultValue={topic?.title_en ?? ""}
            maxLength={200}
          />
        </Field>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={topic?.active ?? true}
            className="h-4 w-4 accent-brand-600"
          />
          {t("common.active")}
        </label>
        <SubmitButton size="sm" pendingText={t("common.saving")}>
          {isEdit ? t("common.save") : t("admin.topics.add_button")}
        </SubmitButton>
      </div>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
    </form>
  );
}

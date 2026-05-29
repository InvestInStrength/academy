"use client";

import { useActionState, useEffect, useRef } from "react";

import type { CourseTopic } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTopic, updateTopic } from "./topic-actions";

type Props = {
  courseId: string;
  topic?: CourseTopic;
};

export function TopicForm({ courseId, topic }: Props) {
  const isEdit = Boolean(topic);
  const [state, formAction] = useActionState(
    isEdit ? updateTopic : createTopic,
    emptyFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the "add topic" form after a successful insert so another can be added.
  useEffect(() => {
    if (state.ok && !isEdit) {
      formRef.current?.reset();
    }
  }, [state, isEdit]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      {isEdit && <input type="hidden" name="id" value={topic!.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_140px_90px]">
        <Field label="Topic title" htmlFor={`title-${topic?.id ?? "new"}`} required error={state.fieldErrors?.title}>
          <Input
            id={`title-${topic?.id ?? "new"}`}
            name="title"
            defaultValue={topic?.title ?? ""}
            required
            maxLength={200}
          />
        </Field>
        <Field label="Code" htmlFor={`code-${topic?.id ?? "new"}`} error={state.fieldErrors?.code}>
          <Input
            id={`code-${topic?.id ?? "new"}`}
            name="code"
            defaultValue={topic?.code ?? ""}
            maxLength={50}
            placeholder="e.g. T1"
          />
        </Field>
        <Field label="Order" htmlFor={`order-${topic?.id ?? "new"}`} error={state.fieldErrors?.sort_order}>
          <Input
            id={`order-${topic?.id ?? "new"}`}
            name="sort_order"
            type="number"
            min={0}
            defaultValue={topic?.sort_order ?? 0}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={topic?.active ?? true}
            className="h-4 w-4 accent-brand-600"
          />
          Active
        </label>
        <SubmitButton size="sm" pendingText="Saving…">
          {isEdit ? "Save" : "Add topic"}
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

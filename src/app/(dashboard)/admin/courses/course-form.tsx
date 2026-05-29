"use client";

import { useActionState } from "react";

import type { Course } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCourse, updateCourse } from "./actions";

export function CourseForm({ course }: { course?: Course }) {
  const isEdit = Boolean(course);
  const [state, formAction] = useActionState(
    isEdit ? updateCourse : createCourse,
    emptyFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={course!.id} />}

      <Field label="Title" htmlFor="title" required error={state.fieldErrors?.title}>
        <Input
          id="title"
          name="title"
          defaultValue={course?.title ?? ""}
          required
          maxLength={200}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={state.fieldErrors?.description}
      >
        <Textarea
          id="description"
          name="description"
          defaultValue={course?.description ?? ""}
          rows={3}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={course?.active ?? true}
          className="h-4 w-4 accent-brand-600"
        />
        Active
      </label>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText="Saving…">
        {isEdit ? "Save changes" : "Create course"}
      </SubmitButton>
    </form>
  );
}

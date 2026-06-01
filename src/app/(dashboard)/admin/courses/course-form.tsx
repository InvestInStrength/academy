"use client";

import { useActionState } from "react";

import type { Course } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCourse, updateCourse } from "./actions";

export function CourseForm({
  course,
  showEnglish = false,
}: {
  course?: Course;
  showEnglish?: boolean;
}) {
  const isEdit = Boolean(course);
  const t = useT();
  const [state, formAction] = useActionState(
    isEdit ? updateCourse : createCourse,
    emptyFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={course!.id} />}

      <Field
        label={
          showEnglish
            ? t("admin.forms.field.title_de")
            : t("admin.forms.field.title")
        }
        htmlFor="title"
        required
        error={state.fieldErrors?.title}
      >
        <Input
          id="title"
          name="title"
          defaultValue={course?.title ?? ""}
          required
          maxLength={200}
        />
      </Field>

      {showEnglish && (
        <Field
          label={t("admin.forms.field.title_en")}
          htmlFor="title_en"
          error={state.fieldErrors?.title_en}
        >
          <Input
            id="title_en"
            name="title_en"
            defaultValue={course?.title_en ?? ""}
            maxLength={200}
          />
        </Field>
      )}

      <Field
        label={
          showEnglish
            ? t("admin.forms.field.description_de")
            : t("admin.forms.field.description")
        }
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

      {showEnglish && (
        <Field
          label={t("admin.forms.field.description_en")}
          htmlFor="description_en"
          error={state.fieldErrors?.description_en}
        >
          <Textarea
            id="description_en"
            name="description_en"
            defaultValue={course?.description_en ?? ""}
            rows={3}
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={course?.active ?? true}
          className="h-4 w-4 accent-brand-600"
        />
        {t("common.active")}
      </label>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText={t("common.saving")}>
        {isEdit ? t("common.save_changes") : t("admin.courses.create_button")}
      </SubmitButton>
    </form>
  );
}

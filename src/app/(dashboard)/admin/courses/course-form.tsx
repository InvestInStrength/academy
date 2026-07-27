"use client";

import { useActionState } from "react";

import type { Course, CourseKind } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCourse, updateCourse } from "./actions";

export type TemplateOption = {
  id: string;
  name: string;
  /** Assigned to this record but no longer active. Kept in the list so the
   * stored value round-trips instead of being silently cleared on save. */
  inactive?: boolean;
};

/**
 * Create/edit form for both certification kinds. A seminar additionally carries
 * the date the event was held (printed on its certificate). `kind` is posted on
 * create only — the update action reads the stored kind — so a record cannot
 * move between the Kurse and Seminare sections.
 */
export function CourseForm({
  course,
  kind = "course",
  templates = [],
  showEnglish = false,
}: {
  course?: Course;
  kind?: CourseKind;
  templates?: TemplateOption[];
  showEnglish?: boolean;
}) {
  const isEdit = Boolean(course);
  const isSeminar = kind === "seminar";
  const t = useT();
  const [state, formAction] = useActionState(
    isEdit ? updateCourse : createCourse,
    emptyFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={course!.id} />}
      <input type="hidden" name="kind" value={kind} />

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

      {isSeminar && (
        <Field
          label={t("admin.seminars.event_date")}
          htmlFor="event_date"
          error={state.fieldErrors?.event_date}
          hint={t("admin.seminars.event_date_hint")}
        >
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={course?.event_date ?? ""}
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

      <Field
        label={t("admin.forms.field.certificate_template")}
        htmlFor="certificate_template_id"
        error={state.fieldErrors?.certificate_template_id}
        hint={t("admin.forms.field.certificate_template_hint")}
      >
        <Select
          id="certificate_template_id"
          name="certificate_template_id"
          defaultValue={course?.certificate_template_id ?? ""}
        >
          <option value="">
            {isSeminar
              ? t("admin.forms.field.template_default_seminar")
              : t("admin.forms.field.template_default_course")}
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.inactive
                ? t("admin.forms.field.template_inactive", { name: template.name })
                : template.name}
            </option>
          ))}
        </Select>
      </Field>

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
        {isEdit
          ? t("common.save_changes")
          : isSeminar
            ? t("admin.seminars.create_button")
            : t("admin.courses.create_button")}
      </SubmitButton>
    </form>
  );
}

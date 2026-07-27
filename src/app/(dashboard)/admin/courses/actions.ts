"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { basePathFor, messagePrefixFor } from "./shared";
import { courseSchema } from "./schema";

/**
 * Server actions for both certification kinds. `courses` rows are either a
 * multi-module course or a single-event seminar (`kind`), surfaced under
 * /admin/courses and /admin/seminars respectively — same table, same actions,
 * different section.
 */

/** Revalidates both sections. A record only ever appears in one of them, but
 * revalidating both is a single cheap call and removes any chance of a stale
 * list after an edit. */
function revalidateBoth(id?: string): void {
  revalidatePath("/admin/courses");
  revalidatePath("/admin/seminars");
  if (id) {
    revalidatePath(`/admin/courses/${id}`);
    revalidatePath(`/admin/seminars/${id}`);
  }
}

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    title_en: formData.get("title_en") || undefined,
    description: formData.get("description") || undefined,
    description_en: formData.get("description_en") || undefined,
    event_date: formData.get("event_date") ?? undefined,
    certificate_template_id: formData.get("certificate_template_id") ?? undefined,
    active: formData.get("active") === "on",
  });
}

function nullOrText(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

export async function createCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const d = parsed.data;
  const description = nullOrText(d.description);
  const { data, error } = await supabase
    .from("courses")
    .insert({
      kind: d.kind,
      title: d.title,
      title_de: d.title,
      title_en: nullOrText(d.title_en),
      description,
      description_de: description,
      description_en: nullOrText(d.description_en),
      // The DB rejects an event date on a course; keep the write consistent
      // with that rather than relying on the constraint to catch it.
      event_date: d.kind === "seminar" ? nullOrText(d.event_date) : null,
      certificate_template_id: nullOrText(d.certificate_template_id),
      active: d.active,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { message: t(`${messagePrefixFor(d.kind)}.could_not_create`) };
  }

  revalidateBoth();
  redirect(`${basePathFor(d.kind)}/${data.id}`);
}

export async function updateCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { message: t("validation.generic_error") };
  }

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  // `kind` is immutable: read the stored value instead of trusting the posted
  // one, so a record can never jump between the two admin sections (which would
  // also change which certificate template its future certificates use).
  const { data: existing } = await supabase
    .from("courses")
    .select("kind")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return { message: t("validation.generic_error") };
  }
  const kind = existing.kind;

  const d = parsed.data;
  const description = nullOrText(d.description);
  const { error } = await supabase
    .from("courses")
    .update({
      title: d.title,
      title_de: d.title,
      title_en: nullOrText(d.title_en),
      description,
      description_de: description,
      description_en: nullOrText(d.description_en),
      event_date: kind === "seminar" ? nullOrText(d.event_date) : null,
      certificate_template_id: nullOrText(d.certificate_template_id),
      active: d.active,
    })
    .eq("id", id);

  const p = messagePrefixFor(kind);
  if (error) {
    return { message: t(`${p}.could_not_save`) };
  }

  revalidateBoth(id);
  return { ok: true, message: t(`${p}.saved`) };
}

export async function toggleCourseActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("courses").update({ active }).eq("id", id);
  revalidateBoth(id);
}

export async function deleteCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const { data: existing } = await supabase
    .from("courses")
    .select("kind")
    .eq("id", id)
    .maybeSingle();

  // Only unused courses may be hard-deleted; otherwise deactivate.
  const [{ count: questionCount }, { count: questionnaireCount }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", id),
      supabase
        .from("questionnaires")
        .select("*", { count: "exact", head: true })
        .eq("course_id", id),
    ]);

  const p = messagePrefixFor(existing?.kind ?? "course");
  if ((questionCount ?? 0) > 0 || (questionnaireCount ?? 0) > 0) {
    return { message: t(`${p}.cannot_delete_with_questions`) };
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) {
    return { message: t(`${p}.could_not_delete`) };
  }

  revalidateBoth();
  redirect(basePathFor(existing?.kind ?? "course"));
}

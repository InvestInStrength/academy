"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { topicSchema } from "./topic-schema";

/** Topics belong to a `courses` row, which is surfaced under /admin/courses or
 * /admin/seminars depending on its kind. The topic actions don't know which, so
 * they revalidate both — one extra cheap call instead of threading the kind
 * through every form. */
function revalidateOwner(courseId: string): void {
  if (!courseId) return;
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/seminars/${courseId}`);
}

function parseTopicForm(formData: FormData) {
  return topicSchema.safeParse({
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    title_en: formData.get("title_en") || undefined,
    code: formData.get("code") || undefined,
    sort_order: formData.get("sort_order") ?? 0,
    active: formData.get("active") === "on",
  });
}

function nullOrText(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

export async function createTopic(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const parsed = parseTopicForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const { error } = await supabase.from("course_topics").insert({
    course_id: parsed.data.course_id,
    title: parsed.data.title,
    title_de: parsed.data.title,
    title_en: nullOrText(parsed.data.title_en),
    code: parsed.data.code ?? null,
    sort_order: parsed.data.sort_order,
    active: parsed.data.active,
  });

  if (error) {
    return { message: t("admin.topics.could_not_create") };
  }

  revalidateOwner(parsed.data.course_id);
  return { ok: true, message: t("admin.topics.added") };
}

export async function updateTopic(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const parsed = parseTopicForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const { error } = await supabase
    .from("course_topics")
    .update({
      title: parsed.data.title,
      title_de: parsed.data.title,
      title_en: nullOrText(parsed.data.title_en),
      code: parsed.data.code ?? null,
      sort_order: parsed.data.sort_order,
      active: parsed.data.active,
    })
    .eq("id", id);

  if (error) {
    return { message: t("admin.topics.could_not_save") };
  }

  revalidateOwner(parsed.data.course_id);
  return { ok: true, message: t("admin.topics.saved") };
}

export async function toggleTopicActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("course_topics").update({ active }).eq("id", id);
  revalidateOwner(courseId);
}

export async function deleteTopic(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const { count: questionCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", id);

  if ((questionCount ?? 0) > 0) {
    return { message: t("admin.topics.cannot_delete_with_questions") };
  }

  const { error } = await supabase.from("course_topics").delete().eq("id", id);
  if (error) {
    return { message: t("admin.topics.could_not_delete") };
  }

  revalidateOwner(courseId);
  return { ok: true, message: t("admin.topics.deleted") };
}

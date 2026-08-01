"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { logger, reportError } from "@/lib/logger";
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
    logger.error(
      "admin.topic.create_failed",
      { courseId: parsed.data.course_id },
      error,
    );
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
    logger.error(
      "admin.topic.update_failed",
      { topicId: id, courseId: parsed.data.course_id },
      error,
    );
    return { message: t("admin.topics.could_not_save") };
  }

  revalidateOwner(parsed.data.course_id);
  return { ok: true, message: t("admin.topics.saved") };
}

export async function toggleTopicActive(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) {
    // The button posted without its hidden id: the click changed nothing at
    // all, which is precisely the failure that used to leave no trace.
    const reference = reportError(
      "admin.topic.toggle_active_missing_id",
      new Error("toggleTopicActive received no topic id"),
      { courseId, active },
    );
    return { message: t("admin.topics.could_not_change_status", { reference }) };
  }

  const { error } = await supabase
    .from("course_topics")
    .update({ active })
    .eq("id", id);
  const reference = error
    ? reportError("admin.topic.toggle_active_failed", error, {
        topicId: id,
        courseId,
        active,
      })
    : null;

  // Revalidated on failure too: the topic then re-renders as it really is,
  // instead of leaving the state the click implied.
  revalidateOwner(courseId);

  if (reference) {
    return { message: t("admin.topics.could_not_change_status", { reference }) };
  }
  // No success message on purpose — this button is clicked constantly.
  return { ok: true };
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

  const { count: questionCount, error: countError } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", id);

  // A failed count reads as zero and would let the delete through.
  if (countError) {
    logger.error("admin.topic.usage_count_failed", { topicId: id }, countError);
  }

  if ((questionCount ?? 0) > 0) {
    return { message: t("admin.topics.cannot_delete_with_questions") };
  }

  const { error } = await supabase.from("course_topics").delete().eq("id", id);
  if (error) {
    logger.error("admin.topic.delete_failed", { topicId: id, courseId }, error);
    return { message: t("admin.topics.could_not_delete") };
  }

  revalidateOwner(courseId);
  return { ok: true, message: t("admin.topics.deleted") };
}

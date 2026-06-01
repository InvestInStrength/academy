"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { topicSchema } from "./topic-schema";

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

  const parsed = parseTopicForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
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
    return { message: "Could not create the topic. Please try again." };
  }

  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return { ok: true, message: "Topic added." };
}

export async function updateTopic(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing topic id." };

  const parsed = parseTopicForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
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
    return { message: "Could not save the topic. Please try again." };
  }

  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return { ok: true, message: "Topic saved." };
}

export async function toggleTopicActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("course_topics").update({ active }).eq("id", id);
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteTopic(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id) return { message: "Missing topic id." };

  const { count: questionCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", id);

  if ((questionCount ?? 0) > 0) {
    return {
      message:
        "Cannot delete: questions are assigned to this topic. Reassign them or deactivate the topic.",
    };
  }

  const { error } = await supabase.from("course_topics").delete().eq("id", id);
  if (error) {
    return { message: "Could not delete the topic. Please try again." };
  }

  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true, message: "Topic deleted." };
}

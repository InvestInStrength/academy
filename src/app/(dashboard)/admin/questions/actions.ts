"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { questionSchema } from "./schema";

async function topicBelongsToCourse(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  topicId: string,
  courseId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("course_topics")
    .select("id")
    .eq("id", topicId)
    .eq("course_id", courseId)
    .maybeSingle();
  return Boolean(data);
}

function nullOrText(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function parseQuestionForm(formData: FormData) {
  const topicId = formData.get("topic_id");
  let options: unknown;
  try {
    options = JSON.parse(String(formData.get("options") ?? "[]"));
  } catch {
    options = [];
  }

  return questionSchema.safeParse({
    course_id: formData.get("course_id"),
    topic_id: topicId ? String(topicId) : null,
    question_text: formData.get("question_text"),
    question_text_en: formData.get("question_text_en") || undefined,
    question_type: formData.get("question_type"),
    explanation: formData.get("explanation") || undefined,
    explanation_en: formData.get("explanation_en") || undefined,
    recommendation_text: formData.get("recommendation_text") || undefined,
    recommendation_text_en: formData.get("recommendation_text_en") || undefined,
    active: formData.get("active") === "on",
    options,
  });
}

export async function createQuestion(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const parsed = parseQuestionForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const data = parsed.data;
  if (data.topic_id && !(await topicBelongsToCourse(supabase, data.topic_id, data.course_id))) {
    return {
      message: t("admin.questions.topic_not_in_course"),
      fieldErrors: { topic_id: t("admin.questions.choose_topic_from_course") },
    };
  }

  const explanation = nullOrText(data.explanation);
  const recommendationText = nullOrText(data.recommendation_text);
  const { data: inserted, error } = await supabase
    .from("questions")
    .insert({
      course_id: data.course_id,
      topic_id: data.topic_id,
      question_text: data.question_text,
      question_text_de: data.question_text,
      question_text_en: nullOrText(data.question_text_en),
      question_type: data.question_type,
      explanation,
      explanation_de: explanation,
      explanation_en: nullOrText(data.explanation_en),
      recommendation_text: recommendationText,
      recommendation_text_de: recommendationText,
      recommendation_text_en: nullOrText(data.recommendation_text_en),
      active: data.active,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { message: t("admin.questions.could_not_create") };
  }

  const { error: optionsError } = await supabase.from("question_options").insert(
    data.options.map((option, index) => ({
      question_id: inserted.id,
      option_text: option.option_text,
      option_text_de: option.option_text,
      option_text_en: nullOrText(option.option_text_en),
      is_correct: option.is_correct,
      sort_order: index,
    })),
  );

  if (optionsError) {
    // Roll back the orphaned question so the bank stays consistent.
    await supabase.from("questions").delete().eq("id", inserted.id);
    return { message: t("admin.questions.could_not_save_options") };
  }

  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

export async function updateQuestion(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const parsed = parseQuestionForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const data = parsed.data;
  if (data.topic_id && !(await topicBelongsToCourse(supabase, data.topic_id, data.course_id))) {
    return {
      message: t("admin.questions.topic_not_in_course"),
      fieldErrors: { topic_id: t("admin.questions.choose_topic_from_course") },
    };
  }

  const explanation = nullOrText(data.explanation);
  const recommendationText = nullOrText(data.recommendation_text);
  const { error } = await supabase
    .from("questions")
    .update({
      course_id: data.course_id,
      topic_id: data.topic_id,
      question_text: data.question_text,
      question_text_de: data.question_text,
      question_text_en: nullOrText(data.question_text_en),
      question_type: data.question_type,
      explanation,
      explanation_de: explanation,
      explanation_en: nullOrText(data.explanation_en),
      recommendation_text: recommendationText,
      recommendation_text_de: recommendationText,
      recommendation_text_en: nullOrText(data.recommendation_text_en),
      active: data.active,
    })
    .eq("id", id);

  if (error) {
    return { message: t("admin.questions.could_not_save") };
  }

  // Options have no external references in Slice 1, and every attempt stores its
  // own snapshot, so replacing the option set on edit is safe.
  await supabase.from("question_options").delete().eq("question_id", id);
  const { error: optionsError } = await supabase.from("question_options").insert(
    data.options.map((option, index) => ({
      question_id: id,
      option_text: option.option_text,
      option_text_de: option.option_text,
      option_text_en: nullOrText(option.option_text_en),
      is_correct: option.is_correct,
      sort_order: index,
    })),
  );

  if (optionsError) {
    return { message: t("admin.questions.options_failed") };
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { ok: true, message: t("admin.questions.saved") };
}

export async function toggleQuestionActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("questions").update({ active }).eq("id", id);
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
}

export async function deleteQuestion(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const { count: usageCount } = await supabase
    .from("questionnaire_questions")
    .select("*", { count: "exact", head: true })
    .eq("question_id", id);

  if ((usageCount ?? 0) > 0) {
    return { message: t("admin.questions.cannot_delete_in_use") };
  }

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) {
    return { message: t("admin.questions.could_not_delete") };
  }

  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

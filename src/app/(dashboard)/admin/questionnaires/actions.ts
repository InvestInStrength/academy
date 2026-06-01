"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { questionnaireSchema } from "./schema";

function parseQuestionnaireForm(formData: FormData) {
  let questionIds: unknown;
  try {
    questionIds = JSON.parse(String(formData.get("question_ids") ?? "[]"));
  } catch {
    questionIds = [];
  }

  return questionnaireSchema.safeParse({
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    title_en: formData.get("title_en") || undefined,
    description: formData.get("description") || undefined,
    description_en: formData.get("description_en") || undefined,
    passing_percentage: formData.get("passing_percentage") ?? 80,
    randomize_question_order: formData.get("randomize_question_order") === "on",
    randomize_answer_order: formData.get("randomize_answer_order") === "on",
    active: formData.get("active") === "on",
    question_ids: questionIds,
  });
}

function nullOrText(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

/**
 * Returns the submitted ids that may be linked, preserving submitted order:
 * they must belong to the course and be active, EXCEPT ids in `preserve`
 * (already linked) which are kept even if now inactive. Guards against
 * cross-course and newly-added inactive questions.
 */
async function allowedQuestionIds(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  courseId: string,
  submitted: string[],
  preserve: string[] = [],
): Promise<string[]> {
  if (submitted.length === 0) return [];
  const { data } = await supabase
    .from("questions")
    .select("id, active")
    .eq("course_id", courseId);
  const preserveSet = new Set(preserve);
  const allowed = new Set(
    (data ?? [])
      .filter((row) => row.active || preserveSet.has(row.id))
      .map((row) => row.id),
  );
  return submitted.filter((id) => allowed.has(id));
}

async function replaceQuestionnaireQuestions(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  questionnaireId: string,
  questionIds: string[],
): Promise<boolean> {
  await supabase
    .from("questionnaire_questions")
    .delete()
    .eq("questionnaire_id", questionnaireId);

  if (questionIds.length === 0) return true;

  const { error } = await supabase.from("questionnaire_questions").insert(
    questionIds.map((questionId, index) => ({
      questionnaire_id: questionnaireId,
      question_id: questionId,
      sort_order: index,
    })),
  );
  return !error;
}

export async function createQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseQuestionnaireForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data = parsed.data;
  const description = nullOrText(data.description);
  const { data: inserted, error } = await supabase
    .from("questionnaires")
    .insert({
      course_id: data.course_id,
      title: data.title,
      title_de: data.title,
      title_en: nullOrText(data.title_en),
      description,
      description_de: description,
      description_en: nullOrText(data.description_en),
      passing_percentage: data.passing_percentage,
      randomize_question_order: data.randomize_question_order,
      randomize_answer_order: data.randomize_answer_order,
      active: data.active,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { message: "Could not create the questionnaire. Please try again." };
  }

  const ids = await allowedQuestionIds(
    supabase,
    data.course_id,
    data.question_ids,
  );
  if (data.active && ids.length === 0) {
    // The questionnaire row exists; roll it back so we don't strand an active
    // questionnaire with no valid questions.
    await supabase.from("questionnaires").delete().eq("id", inserted.id);
    return {
      message: "An active questionnaire needs at least one active question.",
      fieldErrors: { question_ids: "Select at least one active question." },
    };
  }
  await replaceQuestionnaireQuestions(supabase, inserted.id, ids);

  revalidatePath("/admin/questionnaires");
  redirect(`/admin/questionnaires/${inserted.id}`);
}

export async function updateQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing questionnaire id." };

  const parsed = parseQuestionnaireForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data = parsed.data;

  // Locked once it has assignments: structure/scoring and the question set are
  // frozen (also enforced by DB triggers). Only title/description/active change.
  const { count: assignmentCount } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("questionnaire_id", id);
  const isLocked = (assignmentCount ?? 0) > 0;

  if (isLocked) {
    const lockedDescription = nullOrText(data.description);
    const { error } = await supabase
      .from("questionnaires")
      .update({
        title: data.title,
        title_de: data.title,
        title_en: nullOrText(data.title_en),
        description: lockedDescription,
        description_de: lockedDescription,
        description_en: nullOrText(data.description_en),
        active: data.active,
      })
      .eq("id", id);
    if (error) {
      return { message: "Could not save the questionnaire. Please try again." };
    }
    revalidatePath("/admin/questionnaires");
    revalidatePath(`/admin/questionnaires/${id}`);
    return {
      ok: true,
      message:
        "Saved. This questionnaire is locked (it has assignments), so questions and scoring can't change.",
    };
  }

  // Course is fixed after creation, so selected questions cannot be orphaned.
  const unlockedDescription = nullOrText(data.description);
  const { error } = await supabase
    .from("questionnaires")
    .update({
      title: data.title,
      title_de: data.title,
      title_en: nullOrText(data.title_en),
      description: unlockedDescription,
      description_de: unlockedDescription,
      description_en: nullOrText(data.description_en),
      passing_percentage: data.passing_percentage,
      randomize_question_order: data.randomize_question_order,
      randomize_answer_order: data.randomize_answer_order,
      active: data.active,
    })
    .eq("id", id);

  if (error) {
    return { message: "Could not save the questionnaire. Please try again." };
  }

  const { data: existingLinks } = await supabase
    .from("questionnaire_questions")
    .select("question_id")
    .eq("questionnaire_id", id);
  const preserve = (existingLinks ?? []).map((row) => row.question_id);

  const ids = await allowedQuestionIds(
    supabase,
    data.course_id,
    data.question_ids,
    preserve,
  );
  if (data.active && ids.length === 0) {
    return {
      message: "An active questionnaire needs at least one active question.",
      fieldErrors: { question_ids: "Select at least one active question." },
    };
  }
  const ok = await replaceQuestionnaireQuestions(supabase, id, ids);

  revalidatePath("/admin/questionnaires");
  revalidatePath(`/admin/questionnaires/${id}`);
  return ok
    ? { ok: true, message: "Questionnaire saved." }
    : { message: "Saved the questionnaire, but updating questions failed." };
}

export async function toggleQuestionnaireActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("questionnaires").update({ active }).eq("id", id);
  revalidatePath("/admin/questionnaires");
  revalidatePath(`/admin/questionnaires/${id}`);
}

export async function deleteQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing questionnaire id." };

  const { count: assignmentCount } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("questionnaire_id", id);

  if ((assignmentCount ?? 0) > 0) {
    return {
      message:
        "Cannot delete: this questionnaire has certification assignments. Deactivate it instead.",
    };
  }

  const { error } = await supabase.from("questionnaires").delete().eq("id", id);
  if (error) {
    return { message: "Could not delete the questionnaire. Please try again." };
  }

  revalidatePath("/admin/questionnaires");
  redirect("/admin/questionnaires");
}

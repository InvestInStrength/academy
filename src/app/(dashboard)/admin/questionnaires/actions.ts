"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { questionnaireSchema } from "./schema";

function parseQuestionnaireForm(formData: FormData) {
  let questionIds: unknown;
  try {
    questionIds = JSON.parse(String(formData.get("question_ids") ?? "[]"));
  } catch (error) {
    // Falling back to an empty set would silently unlink every question, so
    // this must never happen unnoticed.
    logger.warn("admin.questionnaire.question_ids_payload_invalid", {}, error);
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
  const { data, error } = await supabase
    .from("questions")
    .select("id, active")
    .eq("course_id", courseId);
  // On a read failure nothing is allowed, which reads downstream as "the admin
  // deselected everything" — the one case where a log is the only evidence.
  if (error) {
    logger.error(
      "admin.questionnaire.question_lookup_failed",
      { courseId, submittedCount: submitted.length },
      error,
    );
  }
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
  const { error: deleteError } = await supabase
    .from("questionnaire_questions")
    .delete()
    .eq("questionnaire_id", questionnaireId);
  if (deleteError) {
    logger.error(
      "admin.questionnaire.links_delete_failed",
      { questionnaireId },
      deleteError,
    );
  }

  if (questionIds.length === 0) return true;

  const { error } = await supabase.from("questionnaire_questions").insert(
    questionIds.map((questionId, index) => ({
      questionnaire_id: questionnaireId,
      question_id: questionId,
      sort_order: index,
    })),
  );
  if (error) {
    // The previous links are already gone here: the questionnaire is left with
    // no questions at all.
    logger.error(
      "admin.questionnaire.links_insert_failed",
      { questionnaireId, questionCount: questionIds.length },
      error,
    );
  }
  return !error;
}

/** Undoes a just-created questionnaire. A failed rollback leaves a stranded
 * row an admin has to clean up by hand, so it is worth its own event. */
async function rollbackQuestionnaire(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  questionnaireId: string,
): Promise<void> {
  const { error } = await supabase
    .from("questionnaires")
    .delete()
    .eq("id", questionnaireId);
  if (error) {
    logger.error(
      "admin.questionnaire.rollback_delete_failed",
      { questionnaireId },
      error,
    );
  }
}

export async function createQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const parsed = parseQuestionnaireForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
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
    logger.error(
      "admin.questionnaire.create_failed",
      { courseId: data.course_id },
      error,
    );
    return { message: t("admin.questionnaires.could_not_create") };
  }

  const ids = await allowedQuestionIds(
    supabase,
    data.course_id,
    data.question_ids,
  );
  if (data.active && ids.length === 0) {
    // The questionnaire row exists; roll it back so we don't strand an active
    // questionnaire with no valid questions.
    await rollbackQuestionnaire(supabase, inserted.id);
    return {
      message: t("admin.questionnaires.needs_active_question"),
      fieldErrors: { question_ids: t("admin.questionnaires.select_active_question") },
    };
  }
  const linked = await replaceQuestionnaireQuestions(supabase, inserted.id, ids);
  if (!linked) {
    // Roll back so we never strand a questionnaire (possibly active) whose
    // question links failed to persist.
    await rollbackQuestionnaire(supabase, inserted.id);
    return { message: t("admin.questionnaires.could_not_create") };
  }

  revalidatePath("/admin/questionnaires");
  redirect(`/admin/questionnaires/${inserted.id}`);
}

export async function updateQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const parsed = parseQuestionnaireForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const data = parsed.data;

  // Locked once it has assignments: structure/scoring and the question set are
  // frozen (also enforced by DB triggers). Only title/description/active change.
  const { count: assignmentCount, error: assignmentCountError } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("questionnaire_id", id);
  // A failed count reads as "not locked" and the DB trigger becomes the only
  // thing standing between an edit and a frozen questionnaire.
  if (assignmentCountError) {
    logger.error(
      "admin.questionnaire.assignment_count_failed",
      { questionnaireId: id },
      assignmentCountError,
    );
  }
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
      logger.error(
        "admin.questionnaire.update_failed",
        { questionnaireId: id, locked: true },
        error,
      );
      return { message: t("admin.questionnaires.could_not_save") };
    }
    revalidatePath("/admin/questionnaires");
    revalidatePath(`/admin/questionnaires/${id}`);
    return { ok: true, message: t("admin.questionnaires.locked_save_notice") };
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
    logger.error(
      "admin.questionnaire.update_failed",
      { questionnaireId: id, locked: false },
      error,
    );
    return { message: t("admin.questionnaires.could_not_save") };
  }

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("questionnaire_questions")
    .select("question_id")
    .eq("questionnaire_id", id);
  // Without the existing links, questions that went inactive since they were
  // linked silently drop out of the questionnaire.
  if (existingLinksError) {
    logger.error(
      "admin.questionnaire.links_load_failed",
      { questionnaireId: id },
      existingLinksError,
    );
  }
  const preserve = (existingLinks ?? []).map((row) => row.question_id);

  const ids = await allowedQuestionIds(
    supabase,
    data.course_id,
    data.question_ids,
    preserve,
  );
  if (data.active && ids.length === 0) {
    return {
      message: t("admin.questionnaires.needs_active_question"),
      fieldErrors: { question_ids: t("admin.questionnaires.select_active_question") },
    };
  }
  const ok = await replaceQuestionnaireQuestions(supabase, id, ids);

  revalidatePath("/admin/questionnaires");
  revalidatePath(`/admin/questionnaires/${id}`);
  return ok
    ? { ok: true, message: t("admin.questionnaires.saved") }
    : { message: t("admin.questionnaires.could_not_save_questions") };
}

export async function toggleQuestionnaireActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const { error } = await supabase
    .from("questionnaires")
    .update({ active })
    .eq("id", id);
  if (error) {
    logger.error(
      "admin.questionnaire.toggle_active_failed",
      { questionnaireId: id, active },
      error,
    );
  }

  revalidatePath("/admin/questionnaires");
  revalidatePath(`/admin/questionnaires/${id}`);
}

export async function deleteQuestionnaire(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const { count: assignmentCount, error: countError } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("questionnaire_id", id);

  // A failed count reads as zero and would let an assigned questionnaire go.
  if (countError) {
    logger.error(
      "admin.questionnaire.assignment_count_failed",
      { questionnaireId: id },
      countError,
    );
  }

  if ((assignmentCount ?? 0) > 0) {
    return { message: t("admin.questionnaires.cannot_delete_in_use") };
  }

  const { error } = await supabase.from("questionnaires").delete().eq("id", id);
  if (error) {
    logger.error(
      "admin.questionnaire.delete_failed",
      { questionnaireId: id },
      error,
    );
    return { message: t("admin.questionnaires.could_not_delete") };
  }

  revalidatePath("/admin/questionnaires");
  redirect("/admin/questionnaires");
}

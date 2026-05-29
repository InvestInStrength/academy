"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { issueCertificate } from "@/lib/certificate/issue";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import type { Json } from "@/types/database";
import {
  assignmentCreateSchema,
  assignmentTopicsSchema,
  participantSchema,
} from "./schema";

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/** Append an immutable event to account_history. */
async function logAccountEvent(
  supabase: Supabase,
  adminId: string,
  params: {
    participantId: string;
    assignmentId?: string | null;
    type: string;
    label?: string;
    data?: Json;
  },
): Promise<void> {
  await supabase.from("account_history").insert({
    participant_id: params.participantId,
    certification_assignment_id: params.assignmentId ?? null,
    event_type: params.type,
    event_label: params.label ?? null,
    event_data: params.data ?? null,
    created_by_admin_id: adminId,
  });
}

function parseParticipantForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  return participantSchema.safeParse({
    full_name: formData.get("full_name"),
    certificate_display_name: formData.get("certificate_display_name") || undefined,
    email: email || undefined,
  });
}

function parseJsonIds(value: FormDataEntryValue | null): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function createParticipant(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();

  const parsed = parseParticipantForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({
      full_name: parsed.data.full_name,
      certificate_display_name: parsed.data.certificate_display_name ?? null,
      email: parsed.data.email ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { message: "Could not create the participant. Please try again." };
  }

  await logAccountEvent(supabase, user.id, {
    participantId: data.id,
    type: "participant_created",
    label: "Participant created",
  });

  revalidatePath("/admin/participants");
  redirect(`/admin/participants/${data.id}`);
}

export async function updateParticipant(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing participant id." };

  const parsed = parseParticipantForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { error } = await supabase
    .from("participants")
    .update({
      full_name: parsed.data.full_name,
      certificate_display_name: parsed.data.certificate_display_name ?? null,
      email: parsed.data.email ?? null,
    })
    .eq("id", id);

  if (error) {
    return { message: "Could not save the participant. Please try again." };
  }

  revalidatePath(`/admin/participants/${id}`);
  revalidatePath("/admin/participants");
  return { ok: true, message: "Participant saved." };
}

export async function deleteParticipant(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing participant id." };

  const { count } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", id);

  if ((count ?? 0) > 0) {
    return {
      message:
        "Cannot delete: this participant has certification assignments. Deactivate those instead.",
    };
  }

  const { error } = await supabase.from("participants").delete().eq("id", id);
  if (error) {
    return { message: "Could not delete the participant. Please try again." };
  }

  revalidatePath("/admin/participants");
  redirect("/admin/participants");
}

// ---------------------------------------------------------------------------
// Certification assignments
// ---------------------------------------------------------------------------

/** Keeps only topic ids that belong to the given course, preserving order. */
async function topicIdsForCourse(
  supabase: Supabase,
  courseId: string,
  submitted: string[],
): Promise<string[]> {
  if (submitted.length === 0) return [];
  const { data } = await supabase
    .from("course_topics")
    .select("id")
    .eq("course_id", courseId);
  const allowed = new Set((data ?? []).map((row) => row.id));
  return submitted.filter((id) => allowed.has(id));
}

export async function createAssignment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();

  const participantId = String(formData.get("participant_id") ?? "");
  if (!participantId) return { message: "Missing participant id." };

  const parsed = assignmentCreateSchema.safeParse({
    questionnaire_id: formData.get("questionnaire_id"),
    topic_ids: parseJsonIds(formData.get("topic_ids")),
  });
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("id, course_id, active")
    .eq("id", parsed.data.questionnaire_id)
    .maybeSingle();

  if (!questionnaire) {
    return { message: "That questionnaire no longer exists." };
  }
  if (!questionnaire.active) {
    return { message: "That questionnaire is inactive. Activate it first." };
  }

  const { count: activeDuplicate } = await supabase
    .from("certification_assignments")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", participantId)
    .eq("questionnaire_id", parsed.data.questionnaire_id)
    .eq("active", true);

  if ((activeDuplicate ?? 0) > 0) {
    return {
      message:
        "This participant already has an active assignment for that questionnaire.",
    };
  }

  const { data: assignment, error } = await supabase
    .from("certification_assignments")
    .insert({
      participant_id: participantId,
      questionnaire_id: parsed.data.questionnaire_id,
    })
    .select("id, access_token")
    .single();

  if (error || !assignment) {
    return { message: "Could not create the assignment. Please try again." };
  }

  const topicIds = await topicIdsForCourse(
    supabase,
    questionnaire.course_id,
    parsed.data.topic_ids,
  );
  if (topicIds.length > 0) {
    await supabase.from("certification_assignment_topics").insert(
      topicIds.map((topicId, index) => ({
        certification_assignment_id: assignment.id,
        topic_id: topicId,
        sort_order: index,
      })),
    );
  }

  await logAccountEvent(supabase, user.id, {
    participantId,
    assignmentId: assignment.id,
    type: "assignment_created",
    label: "Certification assignment created",
    data: { questionnaire_id: parsed.data.questionnaire_id },
  });

  revalidatePath(`/admin/participants/${participantId}`);
  return { ok: true, message: "Assignment created." };
}

export async function toggleAssignmentActive(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const participantId = String(formData.get("participant_id") ?? "");
  const active = formData.get("active") === "true";
  if (!id || !participantId) return;

  // Reactivating must not create a second active assignment for the same pair.
  if (active) {
    const { data: row } = await supabase
      .from("certification_assignments")
      .select("questionnaire_id")
      .eq("id", id)
      .maybeSingle();
    if (row) {
      const { count } = await supabase
        .from("certification_assignments")
        .select("*", { count: "exact", head: true })
        .eq("participant_id", participantId)
        .eq("questionnaire_id", row.questionnaire_id)
        .eq("active", true)
        .neq("id", id);
      if ((count ?? 0) > 0) return; // conflict — leave as-is
    }
  }

  const { error } = await supabase
    .from("certification_assignments")
    .update({ active })
    .eq("id", id);

  if (!error) {
    await logAccountEvent(supabase, user.id, {
      participantId,
      assignmentId: id,
      type: active ? "assignment_reactivated" : "assignment_deactivated",
      label: active ? "Assignment reactivated" : "Assignment deactivated",
    });
  }

  revalidatePath(`/admin/participants/${participantId}`);
}

export async function regenerateAccessLink(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const participantId = String(formData.get("participant_id") ?? "");
  if (!id || !participantId) return;

  const token = randomBytes(24).toString("hex");
  const { error } = await supabase
    .from("certification_assignments")
    .update({ access_token: token })
    .eq("id", id);

  if (!error) {
    await logAccountEvent(supabase, user.id, {
      participantId,
      assignmentId: id,
      type: "access_link_regenerated",
      label: "Access link regenerated",
    });
  }

  revalidatePath(`/admin/participants/${participantId}`);
}

export async function manualPass(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!assignmentId) return { message: "Missing assignment id." };
  if (reason.length < 3) {
    return {
      message: "A reason is required to manually pass a candidate.",
      fieldErrors: { reason: "Enter a reason (at least 3 characters)." },
    };
  }

  const { data: assignment } = await supabase
    .from("certification_assignments")
    .select("id, participant_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return { message: "That assignment no longer exists." };
  if (assignment.status === "passed") {
    return { message: "This assignment is already marked as passed." };
  }

  const { error } = await supabase
    .from("certification_assignments")
    .update({
      status: "passed",
      passed_at: new Date().toISOString(),
      passed_by_admin: user.id,
      manual_pass_reason: reason,
    })
    .eq("id", assignmentId);

  if (error) {
    return { message: "Could not mark as passed. Please try again." };
  }

  // Reason is backend-only — stored on the assignment and in history, never shown
  // to the candidate or on the certificate.
  await supabase.from("account_history").insert({
    participant_id: assignment.participant_id,
    certification_assignment_id: assignmentId,
    event_type: "manual_pass",
    event_label: "Manually marked as passed",
    event_data: { reason },
    created_by_admin_id: user.id,
  });

  await issueCertificate(supabase, assignmentId, { adminId: user.id });

  revalidatePath(`/admin/participants/${assignment.participant_id}`);
  return { ok: true, message: "Candidate marked as passed; certificate issued." };
}

export async function updateAssignmentTopics(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = assignmentTopicsSchema.safeParse({
    assignment_id: formData.get("assignment_id"),
    topic_ids: parseJsonIds(formData.get("topic_ids")),
  });
  if (!parsed.success) {
    return { message: "Could not update topics." };
  }

  const { data: assignment } = await supabase
    .from("certification_assignments")
    .select("id, participant_id, questionnaire_id")
    .eq("id", parsed.data.assignment_id)
    .maybeSingle();

  if (!assignment) {
    return { message: "That assignment no longer exists." };
  }

  const { data: questionnaire } = await supabase
    .from("questionnaires")
    .select("course_id")
    .eq("id", assignment.questionnaire_id)
    .maybeSingle();

  const topicIds = await topicIdsForCourse(
    supabase,
    questionnaire?.course_id ?? "",
    parsed.data.topic_ids,
  );

  await supabase
    .from("certification_assignment_topics")
    .delete()
    .eq("certification_assignment_id", assignment.id);

  if (topicIds.length > 0) {
    const { error } = await supabase
      .from("certification_assignment_topics")
      .insert(
        topicIds.map((topicId, index) => ({
          certification_assignment_id: assignment.id,
          topic_id: topicId,
          sort_order: index,
        })),
      );
    if (error) {
      return { message: "Could not save the certificate topics." };
    }
  }

  revalidatePath(`/admin/participants/${assignment.participant_id}`);
  return { ok: true, message: "Certificate topics updated." };
}

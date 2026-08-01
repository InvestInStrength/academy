import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CourseKind, Database, Json } from "@/types/database";
import { logger } from "@/lib/logger";
import { verificationUrl } from "@/lib/public-url";
import { renderCertificateSvg } from "@/lib/certificate/render";
import { generateCertificateAssets } from "@/lib/certificate/generate";

type Client = SupabaseClient<Database>;

const MAX_INSERT_ATTEMPTS = 3;

function newVerificationToken(): string {
  return randomBytes(24).toString("hex");
}

function newCertificateNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `IIS-${year}-${suffix}`;
}

/**
 * The certificate already belonging to this assignment, if any.
 *
 * `undefined` means the lookup itself failed. Callers must not read that as
 * "no certificate exists" — doing so would insert a second certificate for an
 * assignment that already has one.
 */
async function findCertificateForAssignment(
  client: Client,
  assignmentId: string,
): Promise<string | null | undefined> {
  const { data, error } = await client
    .from("certificates")
    .select("id")
    .eq("certification_assignment_id", assignmentId)
    .maybeSingle();

  if (error) {
    logger.error("certificate_lookup_failed", { assignmentId }, error);
    return undefined;
  }

  return data?.id ?? null;
}

/**
 * Issues a certificate for a PASSED assignment. Idempotent: returns the existing
 * certificate id if one already exists. The rendered SVG and all displayed data
 * are frozen into `certificate_public_snapshot` so the certificate is immutable.
 *
 * Works with either the service-role client (candidate pass) or an admin's
 * RLS-scoped client (manual pass). Caller is responsible for authorization.
 *
 * Returns `null` on every failure — a passed candidate then has no certificate
 * and nothing retries in the background, so each failure path logs enough
 * context for the admin `reissueCertificate` action to be aimed at the right
 * assignment.
 */
export async function issueCertificate(
  client: Client,
  assignmentId: string,
  options: { adminId?: string | null } = {},
): Promise<string | null> {
  const { data: assignment, error: assignmentError } = await client
    .from("certification_assignments")
    .select("id, participant_id, questionnaire_id, passed_at, certificate_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) {
    logger.error("certificate_issue_assignment_load_failed", { assignmentId }, assignmentError);
    return null;
  }
  if (!assignment) {
    logger.error("certificate_issue_assignment_missing", { assignmentId });
    return null;
  }
  if (assignment.status !== "passed") {
    logger.warn("certificate_issue_skipped_not_passed", {
      assignmentId,
      status: assignment.status,
    });
    return null;
  }

  if (assignment.certificate_id) return assignment.certificate_id;

  const existingId = await findCertificateForAssignment(client, assignmentId);
  if (existingId === undefined) return null;
  if (existingId) return existingId;

  const [
    { data: participant, error: participantError },
    { data: questionnaire, error: questionnaireError },
  ] = await Promise.all([
    client
      .from("participants")
      .select("id, full_name, certificate_display_name")
      .eq("id", assignment.participant_id)
      .maybeSingle(),
    client
      .from("questionnaires")
      .select("id, course_id, certificate_template_id")
      .eq("id", assignment.questionnaire_id)
      .maybeSingle(),
  ]);

  if (!participant || !questionnaire) {
    logger.error(
      "certificate_issue_context_load_failed",
      {
        assignmentId,
        hasParticipant: Boolean(participant),
        hasQuestionnaire: Boolean(questionnaire),
      },
      participantError ?? questionnaireError,
    );
    return null;
  }

  const { data: course, error: courseError } = await client
    .from("courses")
    .select("title, kind, event_date, certificate_template_id")
    .eq("id", questionnaire.course_id)
    .maybeSingle();

  // Not fatal — the fallbacks below still produce a valid certificate — but the
  // title and event date are frozen into an immutable snapshot, so a silent
  // fallback here means a permanently wrong certificate.
  if (courseError || !course) {
    logger.error(
      "certificate_issue_course_load_failed",
      { assignmentId, courseId: questionnaire.course_id },
      courseError,
    );
  }

  const kind: CourseKind = course?.kind ?? "course";
  const isSeminar = kind === "seminar";

  // A seminar certificate never lists topics — it certifies attendance at one
  // event, and its template uses that slot for the event date. Seminars may
  // still have topics (they drive learning recommendations after a failed
  // attempt), so this is skipped by kind rather than by "has no topics".
  let topics: string[] = [];
  if (!isSeminar) {
    const { data: topicLinks } = await client
      .from("certification_assignment_topics")
      .select("topic_id, sort_order")
      .eq("certification_assignment_id", assignmentId)
      .order("sort_order");
    const topicIds = (topicLinks ?? []).map((l) => l.topic_id);
    if (topicIds.length) {
      const { data: topicRows } = await client
        .from("course_topics")
        .select("id, title")
        .in("id", topicIds);
      const titleById = new Map((topicRows ?? []).map((t) => [t.id, t.title]));
      topics = topicIds
        .map((id) => titleById.get(id))
        .filter((t): t is string => Boolean(t));
    }
  }

  // Template resolution, most specific first: a template pinned to this
  // questionnaire wins; otherwise the course/seminar's own artwork; otherwise
  // the renderer falls back to the built-in template for `kind`. Each seminar
  // ships its own designed SVG (its name and series number are part of the
  // artwork), which is what the course-level slot is for.
  const templateId =
    questionnaire.certificate_template_id ?? course?.certificate_template_id ?? null;
  let templateSvg: string | null = null;
  if (templateId) {
    const { data: template, error: templateError } = await client
      .from("certificate_templates")
      .select("svg_template, active")
      .eq("id", templateId)
      .maybeSingle();
    // Falling back to the built-in artwork is the safe behaviour, but the
    // result is frozen — an unnoticed fallback ships the wrong design forever.
    if (templateError || !template) {
      logger.error(
        "certificate_template_load_failed",
        { assignmentId, templateId },
        templateError,
      );
    }
    if (template?.active) templateSvg = template.svg_template;
  }

  const candidateName =
    participant.certificate_display_name?.trim() || participant.full_name;
  const courseTitle = course?.title ?? "Certification";
  const completionDate = assignment.passed_at ?? new Date().toISOString();
  const eventDate = isSeminar ? (course?.event_date ?? null) : null;

  // Generate number+token, render, insert. Retry on the rare number collision.
  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const certificateNumber = newCertificateNumber();
    const verificationToken = newVerificationToken();
    const url = verificationUrl(verificationToken);

    let svg: string;
    try {
      svg = await renderCertificateSvg(
        {
          certificate_number: certificateNumber,
          candidate_name: candidateName,
          course_title: courseTitle,
          topics,
          completion_date: completionDate,
          verification_url: url,
          kind,
          event_date: eventDate,
        },
        templateSvg,
      );
    } catch (renderError) {
      // Returning null keeps the caller's recovery path (retry action / support
      // reference) instead of throwing an unhandled error out of a Server Action.
      logger.error("certificate_render_failed", { assignmentId, attempt }, renderError);
      return null;
    }

    const snapshot = {
      certificate_number: certificateNumber,
      candidate_name: candidateName,
      course_title: courseTitle,
      topics,
      completion_date: completionDate,
      verification_url: url,
      kind,
      event_date: eventDate,
      svg,
    } as unknown as Json;

    const { data: inserted, error } = await client
      .from("certificates")
      .insert({
        certification_assignment_id: assignmentId,
        certificate_number: certificateNumber,
        verification_token: verificationToken,
        verification_url: url,
        certificate_public_snapshot: snapshot,
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      if (error?.code === "23505") {
        // 23505 covers two very different collisions: a random
        // certificate_number/verification_token clash (retryable) and the UNIQUE
        // on certification_assignment_id, which means a concurrent call already
        // issued this assignment's certificate. Re-fetching tells them apart —
        // without it the concurrent case burned all attempts and returned null,
        // stranding a passed candidate whose certificate actually exists.
        const winner = await findCertificateForAssignment(client, assignmentId);
        if (winner) {
          logger.warn("certificate_issue_lost_race", {
            assignmentId,
            certificateId: winner,
            attempt,
          });
          return winner;
        }
        logger.warn("certificate_number_collision_retry", { assignmentId, attempt });
        continue;
      }
      logger.error("certificate_insert_failed", { assignmentId, attempt }, error);
      return null;
    }

    const { error: backlinkError } = await client
      .from("certification_assignments")
      .update({ certificate_id: inserted.id })
      .eq("id", assignmentId);

    // Recoverable on its own: the certificate row is the source of truth and the
    // next issue call re-derives the link from it. Still a real inconsistency,
    // so it must not stay invisible.
    if (backlinkError) {
      logger.error(
        "certificate_backlink_update_failed",
        { assignmentId, certificateId: inserted.id },
        backlinkError,
      );
    }

    const { error: historyError } = await client.from("account_history").insert({
      participant_id: assignment.participant_id,
      certification_assignment_id: assignmentId,
      event_type: "certificate_generated",
      event_label: "Certificate generated",
      event_data: { certificate_number: certificateNumber },
      created_by_admin_id: options.adminId ?? null,
    });

    if (historyError) {
      logger.error(
        "certificate_history_write_failed",
        { assignmentId, certificateId: inserted.id },
        historyError,
      );
    }

    // Render + store the official PDF and PNG preview. Best-effort: a render or
    // upload failure never blocks issuing — the certificate is already valid and
    // the failure is logged for regeneration from the admin UI.
    await generateCertificateAssets(inserted.id);

    return inserted.id;
  }

  logger.error("certificate_issue_retries_exhausted", {
    assignmentId,
    attempts: MAX_INSERT_ATTEMPTS,
  });
  return null;
}

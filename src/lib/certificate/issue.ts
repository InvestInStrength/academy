import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CourseKind, Database, Json } from "@/types/database";
import { verificationUrl } from "@/lib/public-url";
import { renderCertificateSvg } from "@/lib/certificate/render";
import { generateCertificateAssets } from "@/lib/certificate/generate";

type Client = SupabaseClient<Database>;

function newVerificationToken(): string {
  return randomBytes(24).toString("hex");
}

function newCertificateNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `IIS-${year}-${suffix}`;
}

/**
 * Issues a certificate for a PASSED assignment. Idempotent: returns the existing
 * certificate id if one already exists. The rendered SVG and all displayed data
 * are frozen into `certificate_public_snapshot` so the certificate is immutable.
 *
 * Works with either the service-role client (candidate pass) or an admin's
 * RLS-scoped client (manual pass). Caller is responsible for authorization.
 */
export async function issueCertificate(
  client: Client,
  assignmentId: string,
  options: { adminId?: string | null } = {},
): Promise<string | null> {
  const { data: assignment } = await client
    .from("certification_assignments")
    .select("id, participant_id, questionnaire_id, passed_at, certificate_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment || assignment.status !== "passed") return null;
  if (assignment.certificate_id) return assignment.certificate_id;

  const { data: existing } = await client
    .from("certificates")
    .select("id")
    .eq("certification_assignment_id", assignmentId)
    .maybeSingle();
  if (existing) return existing.id;

  const [{ data: participant }, { data: questionnaire }] = await Promise.all([
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

  if (!participant || !questionnaire) return null;

  const { data: course } = await client
    .from("courses")
    .select("title, kind, event_date, certificate_template_id")
    .eq("id", questionnaire.course_id)
    .maybeSingle();

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
    const { data: template } = await client
      .from("certificate_templates")
      .select("svg_template, active")
      .eq("id", templateId)
      .maybeSingle();
    if (template?.active) templateSvg = template.svg_template;
  }

  const candidateName =
    participant.certificate_display_name?.trim() || participant.full_name;
  const courseTitle = course?.title ?? "Certification";
  const completionDate = assignment.passed_at ?? new Date().toISOString();
  const eventDate = isSeminar ? (course?.event_date ?? null) : null;

  // Generate number+token, render, insert. Retry on the rare number collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const certificateNumber = newCertificateNumber();
    const verificationToken = newVerificationToken();
    const url = verificationUrl(verificationToken);
    const svg = await renderCertificateSvg(
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
      if (error?.code === "23505") continue; // unique collision — retry
      return null;
    }

    await client
      .from("certification_assignments")
      .update({ certificate_id: inserted.id })
      .eq("id", assignmentId);

    await client.from("account_history").insert({
      participant_id: assignment.participant_id,
      certification_assignment_id: assignmentId,
      event_type: "certificate_generated",
      event_label: "Certificate generated",
      event_data: { certificate_number: certificateNumber },
      created_by_admin_id: options.adminId ?? null,
    });

    // Render + store the official PDF and PNG preview. Best-effort: a render or
    // upload failure never blocks issuing — the certificate is already valid and
    // the failure is logged for regeneration from the admin UI.
    await generateCertificateAssets(inserted.id);

    return inserted.id;
  }

  return null;
}

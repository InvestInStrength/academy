import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { issueCertificate } from "@/lib/certificate/issue";
import { pickLocalized } from "@/lib/i18n/content";
import {
  codeExpiry,
  evaluateCode,
  generateCode,
  hashCode,
  type VerifyDecision,
} from "@/lib/certification/email-verification-core";
import type { AnswerMap } from "@/lib/certification/attempt-progress-core";
import type { AssignmentStatus, Json, Locale, QuestionType } from "@/types/database";
import type {
  AttemptScore,
  GradedQuestion,
  TopicRecommendation,
} from "@/lib/certification/scoring";

/**
 * Trusted server-only data access for the public candidate flow. Candidates are
 * not authenticated (RLS would block them), so these helpers use the
 * service-role client — which BYPASSES RLS — and therefore select only the
 * exact fields each surface needs. Never `select("*")` here, and never return
 * scores/answers/email/admin notes to a surface that shouldn't see them.
 */

export type CandidateContext = {
  assignment: {
    id: string;
    status: AssignmentStatus;
    participant_id: string;
    questionnaire_id: string;
  };
  participant: {
    id: string;
    full_name: string;
    certificate_display_name: string | null;
    email: string | null;
    email_confirmed: boolean;
  };
  questionnaire: {
    id: string;
    title: string;
    title_de: string | null;
    title_en: string | null;
    description: string | null;
    description_de: string | null;
    description_en: string | null;
    passing_percentage: number;
    randomize_question_order: boolean;
    randomize_answer_order: boolean;
    course_id: string;
  };
};

/** Picks the locale-resolved questionnaire title from a candidate context. */
export function localizedQuestionnaireTitle(
  questionnaire: CandidateContext["questionnaire"],
  locale: Locale,
): string {
  return pickLocalized(questionnaire, "title", locale) ?? questionnaire.title;
}

/** Picks the locale-resolved questionnaire description (may be null). */
export function localizedQuestionnaireDescription(
  questionnaire: CandidateContext["questionnaire"],
  locale: Locale,
): string | null {
  return pickLocalized(questionnaire, "description", locale);
}

export type LoadedOption = { id: string; option_text: string; is_correct: boolean };
export type LoadedQuestion = {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  topic_id: string | null;
  topic_title: string | null;
  recommendation_text: string | null;
  options: LoadedOption[];
};

export type LatestResult = {
  score_percentage: number | null;
  passed: boolean | null;
  recommendations: TopicRecommendation[];
  submitted_at: string | null;
};

export type CertificateSnapshot = {
  certificate_number: string;
  candidate_name: string;
  course_title: string;
  topics: string[];
  completion_date: string;
  verification_url: string;
  svg: string;
};

export type CertificateAssetUrls = {
  official_pdf: string | null;
  official_png_preview: string | null;
};

export type PublicCertificate = {
  id: string;
  status: "valid" | "revoked";
  certificate_number: string;
  snapshot: CertificateSnapshot;
  assets: CertificateAssetUrls;
};

/**
 * Resolves an access token to its candidate context. Returns null for an
 * invalid OR inactive token — callers must show the same neutral page for both
 * (constant-shape, to avoid token probing).
 */
export async function getCandidateContext(
  accessToken: string,
): Promise<CandidateContext | null> {
  if (!accessToken) return null;
  const service = createSupabaseServiceRoleClient();

  const { data: assignment } = await service
    .from("certification_assignments")
    .select("id, status, active, participant_id, questionnaire_id")
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!assignment || !assignment.active) return null;

  const [{ data: participant }, { data: questionnaire }] = await Promise.all([
    service
      .from("participants")
      .select("id, full_name, certificate_display_name, email, email_confirmed")
      .eq("id", assignment.participant_id)
      .maybeSingle(),
    service
      .from("questionnaires")
      .select(
        "id, title, title_de, title_en, description, description_de, description_en, passing_percentage, randomize_question_order, randomize_answer_order, course_id",
      )
      .eq("id", assignment.questionnaire_id)
      .maybeSingle(),
  ]);

  if (!participant || !questionnaire) return null;

  return {
    assignment: {
      id: assignment.id,
      status: assignment.status,
      participant_id: assignment.participant_id,
      questionnaire_id: assignment.questionnaire_id,
    },
    participant,
    questionnaire,
  };
}

/** Loads the questionnaire's questions (with options + topic titles) in base
 * order. Each text field is locale-resolved through `pickLocalized` using the
 * supplied locale (which the caller derives from the attempt's frozen
 * `language` for in-progress flows, or `platform_settings.active_language`
 * for admin previews). Includes is_correct for server-side grading — callers
 * rendering to the candidate must output only id/text, never is_correct. */
export async function loadQuestionnaireQuestions(
  questionnaireId: string,
  locale: Locale,
): Promise<LoadedQuestion[]> {
  const service = createSupabaseServiceRoleClient();

  const { data: links } = await service
    .from("questionnaire_questions")
    .select("question_id, sort_order")
    .eq("questionnaire_id", questionnaireId)
    .order("sort_order");

  const orderedIds = (links ?? []).map((l) => l.question_id);
  if (orderedIds.length === 0) return [];

  const [{ data: questions }, { data: options }] = await Promise.all([
    service
      .from("questions")
      .select(
        "id, question_text, question_text_de, question_text_en, question_type, topic_id, recommendation_text, recommendation_text_de, recommendation_text_en",
      )
      .in("id", orderedIds),
    service
      .from("question_options")
      .select(
        "id, question_id, option_text, option_text_de, option_text_en, is_correct, sort_order",
      )
      .in("question_id", orderedIds)
      .order("sort_order"),
  ]);

  const topicIds = [
    ...new Set((questions ?? []).map((q) => q.topic_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: topics } = await service
    .from("course_topics")
    .select("id, title, title_de, title_en")
    .in("id", topicIds);
  const topicTitle = new Map(
    (topics ?? []).map((t) => [t.id, pickLocalized(t, "title", locale) ?? t.title]),
  );

  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));
  const optionsByQuestion = new Map<string, LoadedOption[]>();
  for (const option of options ?? []) {
    const list = optionsByQuestion.get(option.question_id) ?? [];
    list.push({
      id: option.id,
      option_text:
        pickLocalized(option, "option_text", locale) ?? option.option_text,
      is_correct: option.is_correct,
    });
    optionsByQuestion.set(option.question_id, list);
  }

  return orderedIds
    .map((id) => questionById.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({
      question_id: q.id,
      question_text:
        pickLocalized(q, "question_text", locale) ?? q.question_text,
      question_type: q.question_type,
      topic_id: q.topic_id,
      topic_title: q.topic_id ? (topicTitle.get(q.topic_id) ?? null) : null,
      recommendation_text: pickLocalized(q, "recommendation_text", locale),
      options: optionsByQuestion.get(q.id) ?? [],
    }));
}

async function logEvent(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  participantId: string,
  assignmentId: string,
  type: string,
  label: string,
  data?: Json,
): Promise<void> {
  await service.from("account_history").insert({
    participant_id: participantId,
    certification_assignment_id: assignmentId,
    event_type: type,
    event_label: label,
    event_data: data ?? null,
    created_by_admin_id: null,
  });
}

/**
 * Begins email verification: stores the candidate's (pending) email,
 * invalidates any prior outstanding codes, and inserts a fresh hashed 6-digit
 * code. Returns the PLAINTEXT code so the caller can email it — it is never
 * stored in the clear. `email_confirmed` stays false until the candidate enters
 * the code (see {@link verifyEmailCode}).
 */
export async function startEmailVerification(
  context: CandidateContext,
  email: string,
): Promise<{ code: string }> {
  const service = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  // Capture the (pending) email; confirmation waits for the code.
  await service
    .from("participants")
    .update({ email, email_confirmed: false })
    .eq("id", context.participant.id);

  // Invalidate any earlier outstanding codes so only the newest one is valid.
  await service
    .from("email_verification_codes")
    .update({ consumed_at: now })
    .eq("participant_id", context.participant.id)
    .is("consumed_at", null);

  const code = generateCode();
  await service.from("email_verification_codes").insert({
    participant_id: context.participant.id,
    email,
    code_hash: hashCode(code),
    expires_at: codeExpiry(Date.now()),
  });

  await logEvent(
    service,
    context.participant.id,
    context.assignment.id,
    "email_submitted",
    "Email submitted",
  );

  return { code };
}

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many" }
  | { ok: false; reason: "invalid"; attemptsRemaining: number };

/**
 * Verifies a submitted code against the newest outstanding row for the
 * participant. On success sets `email_confirmed = true`, consumes the code, and
 * logs `email_confirmed`. On a wrong code, increments that code's attempt
 * counter. The decision itself is the pure {@link evaluateCode}.
 */
export async function verifyEmailCode(
  context: CandidateContext,
  submitted: string,
): Promise<VerifyEmailResult> {
  const service = createSupabaseServiceRoleClient();

  const { data: row } = await service
    .from("email_verification_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("participant_id", context.participant.id)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, reason: "no_code" };

  const decision: VerifyDecision = evaluateCode({
    submitted,
    storedHash: row.code_hash,
    attempts: row.attempts,
    expiresAtMs: new Date(row.expires_at).getTime(),
    consumed: row.consumed_at !== null,
    nowMs: Date.now(),
  });

  if (decision.kind === "ok") {
    await service
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    await service
      .from("participants")
      .update({ email_confirmed: true })
      .eq("id", context.participant.id);
    await logEvent(
      service,
      context.participant.id,
      context.assignment.id,
      "email_confirmed",
      "Email confirmed",
    );
    return { ok: true };
  }

  if (decision.kind === "invalid") {
    await service
      .from("email_verification_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, reason: "invalid", attemptsRemaining: decision.attemptsRemaining };
  }

  return { ok: false, reason: decision.kind };
}

/** Records a completed attempt. Slice 7a: the attempt row already exists (it
 * was created at attempt start by `startOrResumeAttempt`), so this function
 * **updates** the existing row with the grading result + answer snapshots,
 * rather than inserting a new one. The attempt's frozen `language` is included
 * in both the structured row read by callers and the JSON snapshots, as
 * defense-in-depth against schema drift. */
export async function recordAttempt(params: {
  context: CandidateContext;
  attemptId: string;
  attemptNumber: number;
  attemptLanguage: Locale;
  score: AttemptScore;
  recommendations: TopicRecommendation[];
  displayedQuestionOrder: string[];
}): Promise<{ passed: boolean; attempt_number: number }> {
  const {
    context,
    attemptId,
    attemptNumber,
    attemptLanguage,
    score,
    recommendations,
    displayedQuestionOrder,
  } = params;
  const service = createSupabaseServiceRoleClient();

  const attemptSnapshot: Json = {
    language: attemptLanguage,
    questionnaire_id: context.questionnaire.id,
    questionnaire_title: localizedQuestionnaireTitle(
      context.questionnaire,
      attemptLanguage,
    ),
    passing_percentage: context.questionnaire.passing_percentage,
    randomize_question_order: context.questionnaire.randomize_question_order,
    randomize_answer_order: context.questionnaire.randomize_answer_order,
    question_order: displayedQuestionOrder,
    total_questions: score.total,
  };

  // Update the in-progress attempt row. Guarded by `submitted_at IS NULL` so
  // we never overwrite an already-submitted attempt.
  const { error: updError } = await service
    .from("attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score_percentage: score.score_percentage,
      correct_count: score.correct_count,
      wrong_count: score.wrong_count,
      passed: score.passed,
      attempt_snapshot: attemptSnapshot,
      recommendation_snapshot: recommendations as unknown as Json,
    })
    .eq("id", attemptId)
    .is("submitted_at", null);

  if (updError) {
    throw new Error("Failed to record attempt");
  }

  const answerRows = score.graded.map((question: GradedQuestion, index) => ({
    attempt_id: attemptId,
    question_id: question.question_id,
    question_snapshot: {
      language: attemptLanguage,
      question_id: question.question_id,
      question_text: question.question_text,
      question_type: question.question_type,
      topic_id: question.topic_id,
      topic_title: question.topic_title,
      options: question.options,
    } as Json,
    selected_option_ids: question.selected_option_ids,
    selected_option_snapshots: question.options
      .filter((o) => question.selected_option_ids.includes(o.id))
      .map((o) => ({ id: o.id, option_text: o.option_text })) as unknown as Json,
    correct_option_ids: question.correct_option_ids,
    is_correct: question.is_correct,
    displayed_question_order: index,
    displayed_option_order: question.options.map((o) => o.id) as unknown as Json,
  }));

  if (answerRows.length > 0) {
    await service.from("attempt_answers").insert(answerRows);
  }

  // Update assignment status. Never downgrade a passed assignment.
  if (score.passed) {
    await service
      .from("certification_assignments")
      .update({ status: "passed", passed_at: new Date().toISOString() })
      .eq("id", context.assignment.id)
      .neq("status", "passed");
    // Generate the certificate immediately after passing (idempotent).
    await issueCertificate(service, context.assignment.id);
  } else if (context.assignment.status !== "passed") {
    await service
      .from("certification_assignments")
      .update({ status: "failed" })
      .eq("id", context.assignment.id);
  }

  await logEvent(
    service,
    context.participant.id,
    context.assignment.id,
    "attempt_submitted",
    `Attempt ${attemptNumber} submitted`,
    { attempt_number: attemptNumber, score_percentage: score.score_percentage, passed: score.passed },
  );
  await logEvent(
    service,
    context.participant.id,
    context.assignment.id,
    score.passed ? "attempt_passed" : "attempt_failed",
    score.passed ? "Attempt passed" : "Attempt failed",
    { attempt_number: attemptNumber, score_percentage: score.score_percentage },
  );

  return { passed: score.passed, attempt_number: attemptNumber };
}

/**
 * Persist the candidate's working answer map onto the in-progress attempt row.
 * Best-effort autosave: guarded by `submitted_at IS NULL` so it can never
 * touch an already-graded attempt, and it never throws — a failed save just
 * means the next reload falls back to the last persisted state.
 */
export async function persistAttemptProgress(
  attemptId: string,
  answers: AnswerMap,
): Promise<void> {
  const service = createSupabaseServiceRoleClient();
  await service
    .from("attempts")
    .update({ answers: answers as unknown as Json })
    .eq("id", attemptId)
    .is("submitted_at", null);
}

/** The candidate's latest result only — safe fields, no per-question detail. */
export async function getLatestResult(
  assignmentId: string,
): Promise<LatestResult | null> {
  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("attempts")
    .select("score_percentage, passed, recommendation_snapshot, submitted_at")
    .eq("certification_assignment_id", assignmentId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    score_percentage: data.score_percentage,
    passed: data.passed,
    recommendations:
      (data.recommendation_snapshot as unknown as TopicRecommendation[] | null) ?? [],
    submitted_at: data.submitted_at,
  };
}

/** Reads the stored asset public URLs for a certificate (one per type). */
async function certificateAssetUrls(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  certificateId: string,
): Promise<CertificateAssetUrls> {
  const { data } = await service
    .from("certificate_assets")
    .select("asset_type, file_url")
    .eq("certificate_id", certificateId);
  const byType = new Map((data ?? []).map((a) => [a.asset_type, a.file_url]));
  return {
    official_pdf: byType.get("official_pdf") ?? null,
    official_png_preview: byType.get("official_png_preview") ?? null,
  };
}

async function toPublicCertificate(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  row: {
    id: string;
    status: "valid" | "revoked";
    certificate_number: string;
    certificate_public_snapshot: unknown;
  } | null,
): Promise<PublicCertificate | null> {
  if (!row || !row.certificate_public_snapshot) return null;
  return {
    id: row.id,
    status: row.status,
    certificate_number: row.certificate_number,
    snapshot: row.certificate_public_snapshot as CertificateSnapshot,
    assets: await certificateAssetUrls(service, row.id),
  };
}

/** The candidate's certificate for an assignment (via their personal link). */
export async function getCertificateForAssignment(
  assignmentId: string,
): Promise<PublicCertificate | null> {
  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("certificates")
    .select("id, status, certificate_number, certificate_public_snapshot")
    .eq("certification_assignment_id", assignmentId)
    .maybeSingle();
  return toPublicCertificate(service, data);
}

/** Records that a candidate emailed their own certificate (candidate flow). */
export async function markCertificateEmailed(
  assignmentId: string,
  participantId: string,
  email: string,
): Promise<void> {
  const service = createSupabaseServiceRoleClient();
  await service
    .from("certificates")
    .update({ emailed_at: new Date().toISOString() })
    .eq("certification_assignment_id", assignmentId);
  await service.from("account_history").insert({
    participant_id: participantId,
    certification_assignment_id: assignmentId,
    event_type: "certificate_emailed",
    event_label: "Certificate emailed",
    event_data: { email },
    created_by_admin_id: null,
  });
}

/** Public verification lookup. Returns only the immutable snapshot + status —
 * never email, score, attempts, or admin notes. */
export async function getCertificateByVerificationToken(
  token: string,
): Promise<PublicCertificate | null> {
  if (!token) return null;
  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("certificates")
    .select("id, status, certificate_number, certificate_public_snapshot")
    .eq("verification_token", token)
    .maybeSingle();
  return toPublicCertificate(service, data);
}

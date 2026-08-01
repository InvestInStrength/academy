"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { sendCertificateEmail } from "@/lib/email/certificate-email";
import { sendVerificationEmail } from "@/lib/email/verification-email";
import { getDictionary, getServerT, t } from "@/lib/i18n";
import { getInProgressAttempt } from "@/lib/certification/attempt-lifecycle";
import { sanitizeAnswerMap } from "@/lib/certification/attempt-progress-core";
import {
  getCandidateContext,
  getCertificateForAssignment,
  loadQuestionnaireQuestions,
  markCertificateEmailed,
  persistAttemptProgress,
  recordAttempt,
  startEmailVerification,
  verifyEmailCode,
} from "@/lib/certification/data";
import {
  buildRecommendations,
  gradeAttempt,
  type GradableQuestion,
} from "@/lib/certification/scoring";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "validation.email_invalid" }),
});

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "validation.code_invalid" }),
});

async function clientKey(token: string): Promise<string> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${token}:${ip}`;
}

/**
 * Nothing in this file may log the access token, the participant's address, the
 * verification code, answers or scores — assignment and attempt ids are the
 * correlation handles, and they are enough to find the row.
 */

function parseIdArray(value: FormDataEntryValue | null, field: string): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    // Falls back to the DB order below, so grading is unaffected — but a broken
    // payload means the attempt form shipped something malformed.
    logger.warn("candidate.attempt.payload_parse_failed", { field }, error);
    return [];
  }
}

function parseIdMap(
  value: FormDataEntryValue | null,
  field: string,
): Record<string, string[]> {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) out[key] = val.map(String);
    }
    return out;
  } catch (error) {
    logger.warn("candidate.attempt.payload_parse_failed", { field }, error);
    return {};
  }
}

/**
 * Step 1 of email verification (also the "resend" path): validate the email,
 * store it as pending, generate + email a fresh 6-digit code. Returns ok so the
 * client flips to the code-entry step. The email is NOT confirmed here.
 */
export async function submitEmail(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const accessToken = String(formData.get("access_token") ?? "");
  const { t: tr, locale } = await getServerT();

  if (!(await rateLimit(`email:${await clientKey(accessToken)}`, 10, 60_000))) {
    logger.warn("candidate.verify.rate_limited", { action: "submit_email" });
    return { message: tr("validation.too_many_attempts") };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      message: tr("validation.email_invalid"),
      fieldErrors: fieldErrorsFromZod(parsed.error, tr),
    };
  }

  const context = await getCandidateContext(accessToken);
  if (!context) {
    logger.warn("candidate.link.unresolved", { action: "submit_email" });
    return { message: tr("candidate.email.no_link") };
  }

  const { code } = await startEmailVerification(context, parsed.data.email);
  const sent = await sendVerificationEmail({
    toEmail: parsed.data.email,
    code,
    locale,
  });
  if (!sent.ok) {
    // The candidate is now stuck at the code step with a code they never got;
    // the Resend error itself is logged inside the email module.
    logger.error("candidate.verify.email_send_failed", {
      assignmentId: context.assignment.id,
    });
    return { message: tr("candidate.verify.send_failed") };
  }

  return {
    ok: true,
    message: tr("candidate.verify.code_sent", { email: parsed.data.email }),
  };
}

/**
 * Step 2 of email verification: check the 6-digit code. On success the email is
 * confirmed and the candidate is redirected into the attempt; otherwise a
 * localized reason (wrong/expired/too-many/none) comes back.
 */
export async function verifyEmail(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const accessToken = String(formData.get("access_token") ?? "");
  const { t: tr } = await getServerT();

  if (!(await rateLimit(`verify:${await clientKey(accessToken)}`, 10, 60_000))) {
    logger.warn("candidate.verify.rate_limited", { action: "verify_email" });
    return { message: tr("validation.too_many_attempts") };
  }

  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return {
      message: tr("candidate.verify.invalid_code"),
      fieldErrors: fieldErrorsFromZod(parsed.error, tr),
    };
  }

  const context = await getCandidateContext(accessToken);
  if (!context) {
    logger.warn("candidate.link.unresolved", { action: "verify_email" });
    return { message: tr("candidate.email.no_link") };
  }

  const result = await verifyEmailCode(context, parsed.data.code);
  if (result.ok) {
    redirect(`/certification/${accessToken}/attempt`);
  }

  // Rejections are usually a mistyped code, but a run of them on one assignment
  // is the only signal that a candidate is locked out of their own exam.
  logger.warn("candidate.verify.code_rejected", {
    assignmentId: context.assignment.id,
    reason: result.reason,
  });

  if (result.reason === "invalid") {
    return {
      message: tr("candidate.verify.attempts_remaining", {
        remaining: result.attemptsRemaining,
      }),
      fieldErrors: { code: tr("candidate.verify.invalid_code") },
    };
  }

  const messageKey =
    result.reason === "expired"
      ? "candidate.verify.expired"
      : result.reason === "too_many"
        ? "candidate.verify.too_many_attempts"
        : "candidate.verify.no_code";
  return { message: tr(messageKey) };
}

export async function emailMyCertificate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const accessToken = String(formData.get("access_token") ?? "");
  const { t: tr, locale } = await getServerT();

  if (!(await rateLimit(`certemail:${await clientKey(accessToken)}`, 5, 300_000))) {
    logger.warn("candidate.certificate.rate_limited", { action: "email_certificate" });
    return { message: tr("validation.too_many_attempts") };
  }

  const context = await getCandidateContext(accessToken);
  if (!context) {
    logger.warn("candidate.link.unresolved", { action: "email_certificate" });
    return { message: tr("candidate.email.no_link") };
  }
  if (context.assignment.status !== "passed") {
    return { message: tr("candidate.actions.no_certificate_yet") };
  }
  if (!context.participant.email) {
    return { message: tr("candidate.actions.no_email_on_file") };
  }

  const certificate = await getCertificateForAssignment(context.assignment.id);
  if (!certificate || certificate.status !== "valid") {
    // A passed assignment with no valid certificate is an issuance gap, not a
    // candidate mistake.
    logger.warn("candidate.certificate.unavailable", {
      assignmentId: context.assignment.id,
      status: certificate?.status ?? null,
    });
    return { message: tr("candidate.actions.certificate_unavailable") };
  }

  const sent = await sendCertificateEmail({
    toEmail: context.participant.email,
    snapshot: certificate.snapshot,
    locale,
  });
  if (!sent.ok) {
    logger.error("candidate.certificate.email_send_failed", {
      assignmentId: context.assignment.id,
      certificateNumber: certificate.snapshot.certificate_number,
    });
    return { message: tr("candidate.actions.email_send_failed") };
  }

  await markCertificateEmailed(
    context.assignment.id,
    context.participant.id,
    context.participant.email,
  );

  return {
    ok: true,
    message: tr("candidate.actions.email_sent", {
      email: context.participant.email,
    }),
  };
}

/**
 * Autosave the candidate's working answers onto the in-progress attempt row so
 * a reload or connection blip no longer wipes them. Best-effort and silent:
 * called on a debounce from the attempt form, it returns `void` and swallows
 * every failure path (no link, unconfirmed email, no in-progress attempt, rate
 * limited) rather than surfacing an error mid-test. Grading is unaffected —
 * correctness is still recomputed from the DB at submit time.
 */
export async function saveAttemptProgress(
  accessToken: string,
  answers: Record<string, string[]>,
): Promise<void> {
  // Generous window: one debounced save per answer toggle on a long test.
  if (!(await rateLimit(`progress:${await clientKey(accessToken)}`, 120, 60_000))) {
    logger.warn("candidate.attempt.progress_save_failed", { reason: "rate_limited" });
    return;
  }

  const context = await getCandidateContext(accessToken);
  if (!context || !context.participant.email_confirmed) {
    // Silent by design for the candidate, but each of these means answers are
    // no longer being autosaved — the log is the only place that shows it.
    logger.warn("candidate.attempt.progress_save_failed", {
      reason: context ? "email_unconfirmed" : "no_context",
      assignmentId: context?.assignment.id,
    });
    return;
  }

  const inProgress = await getInProgressAttempt(context.assignment.id);
  if (!inProgress) {
    logger.warn("candidate.attempt.progress_save_failed", {
      reason: "no_open_attempt",
      assignmentId: context.assignment.id,
    });
    return;
  }

  await persistAttemptProgress(inProgress.id, sanitizeAnswerMap(answers));
}

export async function submitAttempt(formData: FormData): Promise<void> {
  const accessToken = String(formData.get("access_token") ?? "");

  const context = await getCandidateContext(accessToken);
  if (!context || !context.participant.email_confirmed) {
    // A bounce at submit time loses a completed exam form, so every one of
    // these redirects is worth a line even when the cause is benign.
    logger.warn("candidate.attempt.submit_bounced", {
      reason: context ? "email_unconfirmed" : "no_context",
      assignmentId: context?.assignment.id,
    });
    redirect(`/certification/${accessToken}`);
  }

  if (!(await rateLimit(`attempt:${await clientKey(accessToken)}`, 20, 60_000))) {
    logger.warn("candidate.attempt.submit_bounced", {
      reason: "rate_limited",
      assignmentId: context.assignment.id,
    });
    redirect(`/certification/${accessToken}?busy=1`);
  }

  // The attempt row was created at attempt-start (`startOrResumeAttempt` on
  // the page render). If somehow none exists, bounce back so it can be
  // materialized — never grade against a missing attempt row.
  const inProgress = await getInProgressAttempt(context.assignment.id);
  if (!inProgress) {
    logger.warn("candidate.attempt.submit_bounced", {
      reason: "no_open_attempt",
      assignmentId: context.assignment.id,
    });
    redirect(`/certification/${accessToken}/attempt`);
  }

  const loaded = await loadQuestionnaireQuestions(
    context.questionnaire.id,
    inProgress.language,
  );
  const byId = new Map(loaded.map((q) => [q.question_id, q]));

  // Trust the DB for which questions/options exist; the submitted order only
  // affects the recorded "what was shown", never correctness.
  const submittedOrder = parseIdArray(
    formData.get("question_order"),
    "question_order",
  ).filter((id) => byId.has(id));
  const finalOrder =
    submittedOrder.length === loaded.length
      ? submittedOrder
      : loaded.map((q) => q.question_id);
  const optionOrder = parseIdMap(formData.get("option_order"), "option_order");

  const gradable: GradableQuestion[] = finalOrder.map((questionId) => {
    const question = byId.get(questionId)!;
    const optionIds = question.options.map((o) => o.id);
    const submittedOptionOrder = (optionOrder[questionId] ?? []).filter((id) =>
      optionIds.includes(id),
    );
    const orderedOptionIds =
      submittedOptionOrder.length === optionIds.length
        ? submittedOptionOrder
        : optionIds;
    const orderedOptions = orderedOptionIds.map(
      (id) => question.options.find((o) => o.id === id)!,
    );

    const selected = formData
      .getAll(`q_${questionId}`)
      .map(String)
      .filter((id) => optionIds.includes(id));

    return {
      question_id: question.question_id,
      question_text: question.question_text,
      question_type: question.question_type,
      topic_id: question.topic_id,
      topic_title: question.topic_title,
      recommendation_text: question.recommendation_text,
      options: orderedOptions,
      selected_option_ids:
        question.question_type === "single_choice" ? selected.slice(0, 1) : selected,
    };
  });

  const score = gradeAttempt(gradable, context.questionnaire.passing_percentage);
  const fallbackTopicLabel = t(
    getDictionary(inProgress.language),
    "scoring.general_topic",
  );
  const recommendations = buildRecommendations(score.graded, fallbackTopicLabel);

  try {
    await recordAttempt({
      context,
      attemptId: inProgress.id,
      attemptNumber: inProgress.attempt_number,
      attemptLanguage: inProgress.language,
      score,
      recommendations,
      displayedQuestionOrder: finalOrder,
    });
  } catch (error) {
    // Rethrown unchanged — the candidate still gets the error page they got
    // before. This is the one write where losing a graded exam is unacceptable,
    // so it must never fail without a trace. Never log the score itself.
    logger.error(
      "candidate.attempt.record_failed",
      {
        assignmentId: context.assignment.id,
        attemptId: inProgress.id,
        attemptNumber: inProgress.attempt_number,
      },
      error,
    );
    throw error;
  }

  redirect(`/certification/${accessToken}/result`);
}

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { sendCertificateEmail } from "@/lib/email/certificate-email";
import {
  confirmParticipantEmail,
  getCandidateContext,
  getCertificateForAssignment,
  loadQuestionnaireQuestions,
  markCertificateEmailed,
  recordAttempt,
} from "@/lib/certification/data";
import {
  buildRecommendations,
  gradeAttempt,
  type GradableQuestion,
} from "@/lib/certification/scoring";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
});

async function clientKey(token: string): Promise<string> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${token}:${ip}`;
}

function parseIdArray(value: FormDataEntryValue | null): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseIdMap(value: FormDataEntryValue | null): Record<string, string[]> {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) out[key] = val.map(String);
    }
    return out;
  } catch {
    return {};
  }
}

export async function submitEmail(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const accessToken = String(formData.get("access_token") ?? "");

  if (!rateLimit(`email:${await clientKey(accessToken)}`, 10, 60_000)) {
    return { message: "Too many attempts. Please wait a moment and try again." };
  }

  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      message: "Please enter a valid email.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const context = await getCandidateContext(accessToken);
  if (!context) {
    return { message: "This certification link is no longer available." };
  }

  await confirmParticipantEmail(context, parsed.data.email);
  redirect(`/certification/${accessToken}/attempt`);
}

export async function emailMyCertificate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const accessToken = String(formData.get("access_token") ?? "");

  if (!rateLimit(`certemail:${await clientKey(accessToken)}`, 5, 300_000)) {
    return { message: "Too many requests. Please wait a few minutes." };
  }

  const context = await getCandidateContext(accessToken);
  if (!context) return { message: "This certification link is no longer available." };
  if (context.assignment.status !== "passed") {
    return { message: "There's no certificate to send yet." };
  }
  if (!context.participant.email) {
    return { message: "There's no email on file for this candidate." };
  }

  const certificate = await getCertificateForAssignment(context.assignment.id);
  if (!certificate || certificate.status !== "valid") {
    return { message: "This certificate isn't available." };
  }

  const sent = await sendCertificateEmail({
    toEmail: context.participant.email,
    snapshot: certificate.snapshot,
  });
  if (!sent.ok) {
    return { message: sent.error ?? "Could not send the email." };
  }

  await markCertificateEmailed(
    context.assignment.id,
    context.participant.id,
    context.participant.email,
  );

  return { ok: true, message: `Sent to ${context.participant.email}.` };
}

export async function submitAttempt(formData: FormData): Promise<void> {
  const accessToken = String(formData.get("access_token") ?? "");

  const context = await getCandidateContext(accessToken);
  if (!context || !context.participant.email_confirmed) {
    redirect(`/certification/${accessToken}`);
  }

  if (!rateLimit(`attempt:${await clientKey(accessToken)}`, 20, 60_000)) {
    redirect(`/certification/${accessToken}?busy=1`);
  }

  const loaded = await loadQuestionnaireQuestions(context.questionnaire.id);
  const byId = new Map(loaded.map((q) => [q.question_id, q]));

  // Trust the DB for which questions/options exist; the submitted order only
  // affects the recorded "what was shown", never correctness.
  const submittedOrder = parseIdArray(formData.get("question_order")).filter((id) =>
    byId.has(id),
  );
  const finalOrder =
    submittedOrder.length === loaded.length
      ? submittedOrder
      : loaded.map((q) => q.question_id);
  const optionOrder = parseIdMap(formData.get("option_order"));

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
  const recommendations = buildRecommendations(score.graded);

  await recordAttempt({
    context,
    score,
    recommendations,
    displayedQuestionOrder: finalOrder,
  });

  redirect(`/certification/${accessToken}/result`);
}

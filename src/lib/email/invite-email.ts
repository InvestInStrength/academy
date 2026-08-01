import "server-only";

import { Resend } from "resend";

import { logger } from "@/lib/logger";
import type { Locale } from "@/types/database";

import { buildInviteEmail } from "./invite-email-core";

type SendResult = { ok: boolean; error?: string };

/**
 * Emails a candidate their personal invitation to begin certification via
 * Resend: a localized HTML message with a button to their access link. The API
 * key is read lazily; when email isn't configured this returns ok:false so the
 * caller can treat the invite as best-effort (the assignment is still created)
 * rather than throwing.
 *
 * Because the invite is best-effort, a failure is easy to miss — every path
 * therefore logs the real Resend error. The access link and the candidate's
 * name and address must never appear in a log line; the assessment title is the
 * only safe correlation handle this function has.
 */
export async function sendInviteEmail(params: {
  toEmail: string;
  candidateName: string;
  assessmentTitle: string;
  link: string;
  locale: Locale;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    logger.warn("email.invite.not_configured", {
      hasApiKey: Boolean(apiKey),
      hasFrom: Boolean(from),
    });
    return { ok: false, error: "Email isn't configured on the server." };
  }

  const { toEmail, candidateName, assessmentTitle, link, locale } = params;
  const { subject, html } = buildInviteEmail({
    candidateName,
    assessmentTitle,
    link,
    locale,
  });

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: toEmail, subject, html });
    if (error) {
      logger.error("email.invite.send_failed", { assessmentTitle, locale }, error);
      return { ok: false, error: "Could not send the email. Please try again." };
    }
    return { ok: true };
  } catch (error) {
    logger.error("email.invite.send_threw", { assessmentTitle, locale }, error);
    return { ok: false, error: "Could not send the email. Please try again." };
  }
}

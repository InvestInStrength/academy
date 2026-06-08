import "server-only";

import { Resend } from "resend";

import type { Locale } from "@/types/database";

import { buildVerificationEmail } from "./verification-email-core";

type SendResult = { ok: boolean; error?: string };

/**
 * Emails a candidate their 6-digit verification code via Resend. The API key is
 * read lazily; when email is not configured this returns ok:false (the caller
 * surfaces a friendly error) rather than throwing. Verification cannot complete
 * without delivery, so production MUST have Resend configured.
 */
export async function sendVerificationEmail(params: {
  toEmail: string;
  code: string;
  locale: Locale;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { ok: false, error: "Email isn't configured on the server." };
  }

  const { toEmail, code, locale } = params;
  const { subject, html } = buildVerificationEmail(code, locale);

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: toEmail, subject, html });
    if (error) {
      return { ok: false, error: "Could not send the email. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send the email. Please try again." };
  }
}

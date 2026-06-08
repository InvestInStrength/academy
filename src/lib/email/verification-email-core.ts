import { getDictionary, t } from "@/lib/i18n/dict";
import { CODE_TTL_MINUTES } from "@/lib/certification/email-verification-core";
import type { Locale } from "@/types/database";

import { escapeHtml } from "./certificate-email-core";

/**
 * Pure builder for the candidate email-verification message. No `server-only`,
 * no Resend, no env, so it can be unit-tested. Chrome is localized to the active
 * platform language; the code is data and passes through (HTML-escaped
 * defensively even though it is always digits).
 */

export type VerificationEmail = { subject: string; html: string };

/** Build the localized subject + HTML for a verification-code email. */
export function buildVerificationEmail(
  code: string,
  locale: Locale,
): VerificationEmail {
  const dict = getDictionary(locale);
  const tr = (key: string, params?: Record<string, string | number>) =>
    t(dict, key, params);

  const safeCode = escapeHtml(code);
  const subject = tr("email.verification.subject");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#0f172a; max-width:560px; margin:0 auto;">
    <p style="font-size:12px; letter-spacing:2px; color:#244c73; text-transform:uppercase;">Invest in Strength</p>
    <h1 style="font-size:20px; margin:8px 0 16px;">${tr("email.verification.heading")}</h1>
    <p style="font-size:14px; color:#334155;">${tr("email.verification.intro")}</p>
    <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#0f172a; margin:20px 0; text-align:center;">${safeCode}</p>
    <p style="font-size:13px; color:#64748b;">${tr("email.verification.expiry_note", { minutes: CODE_TTL_MINUTES })}</p>
    <p style="font-size:12px; color:#94a3b8; margin-top:20px;">${tr("email.verification.ignore_note")}</p>
  </div>`;

  return { subject, html };
}

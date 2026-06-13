import { getDictionary, t } from "@/lib/i18n/dict";
import type { Locale } from "@/types/database";

import { escapeHtml } from "./certificate-email-core";

/**
 * Pure builder for the candidate invitation ("start your certification")
 * email — the first message a participant receives when an admin assigns them a
 * questionnaire. No `server-only`, no Resend, no env, so it can be unit-tested.
 * Chrome is localized to the active platform language; the candidate name,
 * assessment title and personal link are data and pass through (HTML-escaped).
 */

export type InviteEmail = { subject: string; html: string };

/** Build the localized subject + HTML for a candidate invitation email. */
export function buildInviteEmail(params: {
  candidateName: string;
  assessmentTitle: string;
  link: string;
  locale: Locale;
}): InviteEmail {
  const { candidateName, assessmentTitle, link, locale } = params;
  const dict = getDictionary(locale);
  const tr = (key: string, p?: Record<string, string | number>) => t(dict, key, p);

  const name = escapeHtml(candidateName);
  const assessment = escapeHtml(assessmentTitle);
  const safeLink = escapeHtml(link);

  const subject = tr("email.invite.subject");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#0f172a; max-width:560px; margin:0 auto;">
    <p style="font-size:12px; letter-spacing:2px; color:#244c73; text-transform:uppercase;">Invest in Strength</p>
    <h1 style="font-size:20px; margin:8px 0 16px;">${tr("email.invite.heading")}</h1>
    <p style="font-size:14px; color:#334155;">${tr("email.invite.greeting", { name })}</p>
    <p style="font-size:14px; color:#334155;">${tr("email.invite.intro", { assessment })}</p>
    <p style="margin:24px 0;">
      <a href="${safeLink}" style="background:#244c73; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-size:14px; font-weight:bold;">${tr("email.invite.cta")}</a>
    </p>
    <p style="font-size:12px; color:#94a3b8;">${tr("email.invite.fallback", { url: safeLink })}</p>
    <p style="font-size:12px; color:#94a3b8; margin-top:20px;">${tr("email.invite.ignore_note")}</p>
  </div>`;

  return { subject, html };
}

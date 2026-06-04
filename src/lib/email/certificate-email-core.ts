import { getDictionary, t } from "@/lib/i18n/dict";
import type { Locale } from "@/types/database";
import type { CertificateSnapshot } from "@/lib/certification/data";

/**
 * Pure builder for the certificate email body. No `server-only`, no Resend, no
 * env — so it can be unit tested directly. The server wrapper
 * (`certificate-email.ts`) handles the actual send.
 *
 * The certificate DOCUMENT stays English (an international credential — locked
 * decision), but this transactional email is candidate-facing comms, so its
 * chrome is localized to the active platform language. Only the email strings
 * are translated; the certificate number, course title and verification URL are
 * data and pass through unchanged.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Locale-aware long date, e.g. "3. Juni 2026" (de) / "3 June 2026" (en). */
export function formatLongDate(iso: string, locale: Locale): string {
  const tag = locale === "de" ? "de-DE" : "en-GB";
  return new Date(iso).toLocaleDateString(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type CertificateEmail = { subject: string; html: string };

/** Build the localized subject + HTML for a certificate email. */
export function buildCertificateEmail(
  snapshot: CertificateSnapshot,
  locale: Locale,
): CertificateEmail {
  const dict = getDictionary(locale);
  const tr = (key: string, params?: Record<string, string | number>) =>
    t(dict, key, params);

  const name = escapeHtml(snapshot.candidate_name);
  const course = escapeHtml(snapshot.course_title);
  const number = escapeHtml(snapshot.certificate_number);
  const date = escapeHtml(formatLongDate(snapshot.completion_date, locale));
  const verifyUrl = snapshot.verification_url;

  const subject = tr("email.certificate.subject", {
    course: snapshot.course_title,
  });

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#0f172a; max-width:560px; margin:0 auto;">
    <p style="font-size:12px; letter-spacing:2px; color:#244c73; text-transform:uppercase;">Invest in Strength</p>
    <h1 style="font-size:20px; margin:8px 0 16px;">${tr("email.certificate.heading")}</h1>
    <p style="font-size:14px; color:#334155;">${tr("email.certificate.greeting", { name, course })}</p>
    <table style="font-size:14px; color:#334155; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0; color:#64748b;">${tr("email.certificate.label_id")}</td><td style="padding:4px 0;">${number}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#64748b;">${tr("email.certificate.label_completed")}</td><td style="padding:4px 0;">${date}</td></tr>
    </table>
    <p style="margin:20px 0;">
      <a href="${verifyUrl}" style="background:#244c73; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:14px; font-weight:bold;">${tr("email.certificate.cta")}</a>
    </p>
    <p style="font-size:12px; color:#94a3b8;">${tr("email.certificate.footer", { url: escapeHtml(verifyUrl) })}</p>
  </div>`;

  return { subject, html };
}

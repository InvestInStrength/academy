import "server-only";

import { Resend } from "resend";

import type { CertificateSnapshot } from "@/lib/certification/data";

type SendResult = { ok: boolean; error?: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sends a candidate their certificate via Resend: an HTML summary with a link to
 * the public verification page, plus the certificate SVG as an attachment.
 *
 * The API key is read lazily — when email isn't configured the function returns
 * a friendly error rather than throwing, so the rest of the app keeps working.
 */
export async function sendCertificateEmail(params: {
  toEmail: string;
  snapshot: CertificateSnapshot;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { ok: false, error: "Email isn't configured on the server." };
  }

  const { toEmail, snapshot } = params;
  const name = escapeHtml(snapshot.candidate_name);
  const course = escapeHtml(snapshot.course_title);
  const number = escapeHtml(snapshot.certificate_number);
  const date = escapeHtml(formatLongDate(snapshot.completion_date));
  const verifyUrl = snapshot.verification_url;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#0f172a; max-width:560px; margin:0 auto;">
    <p style="font-size:12px; letter-spacing:2px; color:#244c73; text-transform:uppercase;">Invest in Strength</p>
    <h1 style="font-size:20px; margin:8px 0 16px;">Your certificate</h1>
    <p style="font-size:14px; color:#334155;">Hi ${name}, congratulations on completing <strong>${course}</strong>.</p>
    <table style="font-size:14px; color:#334155; border-collapse:collapse; margin:16px 0;">
      <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Certificate ID</td><td style="padding:4px 0;">${number}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Completed</td><td style="padding:4px 0;">${date}</td></tr>
    </table>
    <p style="margin:20px 0;">
      <a href="${verifyUrl}" style="background:#244c73; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:14px; font-weight:bold;">View &amp; verify your certificate</a>
    </p>
    <p style="font-size:12px; color:#94a3b8;">Your certificate is attached as an SVG. You can also verify it any time at ${escapeHtml(verifyUrl)}.</p>
  </div>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: toEmail,
      subject: `Your certificate — ${snapshot.course_title}`,
      html,
      attachments: [
        {
          filename: `certificate-${snapshot.certificate_number}.svg`,
          content: Buffer.from(snapshot.svg, "utf8").toString("base64"),
        },
      ],
    });
    if (error) {
      return { ok: false, error: "Could not send the email. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send the email. Please try again." };
  }
}

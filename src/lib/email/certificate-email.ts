import "server-only";

import { Resend } from "resend";

import type { CertificateSnapshot } from "@/lib/certification/data";
import type { Locale } from "@/types/database";

import { buildCertificateEmail } from "./certificate-email-core";

type SendResult = { ok: boolean; error?: string };

/**
 * Sends a candidate their certificate via Resend: a localized HTML summary with
 * a link to the public verification page, plus the certificate SVG as an
 * attachment. The body language follows `locale` (the active platform language
 * at send time); the certificate document itself stays English.
 *
 * The API key is read lazily — when email isn't configured the function returns
 * a friendly error rather than throwing, so the rest of the app keeps working.
 */
export async function sendCertificateEmail(params: {
  toEmail: string;
  snapshot: CertificateSnapshot;
  locale: Locale;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { ok: false, error: "Email isn't configured on the server." };
  }

  const { toEmail, snapshot, locale } = params;
  const { subject, html } = buildCertificateEmail(snapshot, locale);

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: toEmail,
      subject,
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

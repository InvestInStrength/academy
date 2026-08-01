import "server-only";

import { Resend } from "resend";

import type { CertificateSnapshot } from "@/lib/certification/data";
import { logger } from "@/lib/logger";
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
 *
 * Callers only ever see the generic `SendResult`, so every failure path logs the
 * real Resend error here. Never log the recipient address: the certificate
 * number identifies the send well enough to trace it.
 */
export async function sendCertificateEmail(params: {
  toEmail: string;
  snapshot: CertificateSnapshot;
  locale: Locale;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    logger.warn("email.certificate.not_configured", {
      hasApiKey: Boolean(apiKey),
      hasFrom: Boolean(from),
    });
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
      logger.error(
        "email.certificate.send_failed",
        {
          certificateNumber: snapshot.certificate_number,
          locale,
          attachmentBytes: snapshot.svg.length,
        },
        error,
      );
      return { ok: false, error: "Could not send the email. Please try again." };
    }
    return { ok: true };
  } catch (error) {
    logger.error(
      "email.certificate.send_threw",
      { certificateNumber: snapshot.certificate_number, locale },
      error,
    );
    return { ok: false, error: "Could not send the email. Please try again." };
  }
}

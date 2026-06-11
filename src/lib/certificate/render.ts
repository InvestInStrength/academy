import QRCode from "qrcode";

import { DEFAULT_CERTIFICATE_TEMPLATE, ISSUER_NAME } from "./templates";

/**
 * Certificate rendering. Produces a self-contained SVG (no external resources,
 * QR inlined as SVG) so it can be shown on the verification page and converted
 * to PNG client-side. The rendered SVG is snapshotted at issue time and never
 * regenerated, so the certificate is immutable.
 *
 * Per the locked rules the certificate shows the course and included topics but
 * NEVER the score.
 */

export type CertificateRenderData = {
  certificate_number: string;
  candidate_name: string;
  course_title: string;
  topics: string[];
  completion_date: string; // ISO
  verification_url: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Max topics per row before wrapping onto a new line. */
const TOPICS_PER_ROW = 4;
/** Vertical step (user units ≈ pt) between wrapped topic rows. Tuned to the
 * ~12px topics font in the default template. */
const TOPICS_LINE_HEIGHT = 15;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * Builds the inner markup for the `{{included_topics}}` / `{{topics}}` slot:
 * topics laid out in rows of up to {@link TOPICS_PER_ROW}, joined with a middot
 * WITHIN a row and broken onto a new line BETWEEN rows. The dividing symbol only
 * ever sits between two topics in the same row — never at a row's end.
 *
 * The placeholder lives inside the template's topics `<text><tspan x="0" y="0">`
 * element (center-anchored in the default template). The first row continues
 * that tspan; each later row closes it and opens a fresh `<tspan>` re-anchored
 * to `x="0"` (the centered pivot) and stepped down one line, so the rows stack
 * and stay centered instead of overflowing a single line. Each row's text is
 * XML-escaped; the tspan markup itself is literal.
 */
function topicsMarkup(topics: string[]): string {
  const rows = chunk(topics, TOPICS_PER_ROW).map((row) =>
    escapeXml(row.join("  ·  ")),
  );
  if (rows.length === 0) return "";
  return rows
    .slice(1)
    .reduce(
      (acc, row) =>
        `${acc}</tspan><tspan x="0" dy="${TOPICS_LINE_HEIGHT}">${row}`,
      rows[0],
    );
}

/** Strips the XML prolog/doctype from the qrcode library output so it can be
 * nested inside the certificate SVG. */
function inlineQr(qrSvg: string): string {
  return qrSvg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .trim();
}

/** Generates an olive-on-cream QR pointing at the verification URL, sized to
 * fit the default template's QR slot (63pt ≈ 22mm at the A4-landscape pt
 * scale used by the designer's SVG). */
async function qrSvgFor(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: 63,
    errorCorrectionLevel: "M",
    color: { dark: "#3a4039", light: "#fafafa" },
  });
  return inlineQr(svg);
}

/** Replaces every supported placeholder token in the template with the
 * corresponding data. Accepts both the spec's preferred vocabulary
 * (`{{participant_name}}`, `{{certificate_id}}`, `{{verification_qr}}`, etc.)
 * and the legacy short names (`{{candidate_name}}`, `{{certificate_number}}`,
 * `{{qr}}`, ...). All user-supplied text is XML-escaped; the QR is inlined raw. */
function applySubstitutions(
  template: string,
  data: CertificateRenderData,
  qrSvg: string,
): string {
  const candidate = escapeXml(data.candidate_name);
  const courseTitle = escapeXml(data.course_title);
  const topicsText = topicsMarkup(data.topics);
  const completion = escapeXml(formatLongDate(data.completion_date));
  const certificateId = escapeXml(data.certificate_number);
  const verifyUrl = escapeXml(data.verification_url);
  const issuer = escapeXml(ISSUER_NAME);

  return template
    // Preferred vocab (per docs/CERTIFICATE-OUTPUT.md)
    .replaceAll("{{participant_name}}", candidate)
    .replaceAll("{{certificate_display_name}}", candidate)
    .replaceAll("{{course_title}}", courseTitle)
    .replaceAll("{{included_topics}}", topicsText)
    .replaceAll("{{completion_date}}", completion)
    .replaceAll("{{certificate_id}}", certificateId)
    .replaceAll("{{verification_url}}", verifyUrl)
    .replaceAll("{{issuer_name}}", issuer)
    .replaceAll("{{verification_qr}}", qrSvg)
    // Legacy / short-name vocab (back-compat for any earlier templates)
    .replaceAll("{{candidate_name}}", candidate)
    .replaceAll("{{topics}}", topicsText)
    .replaceAll("{{certificate_number}}", certificateId)
    .replaceAll("{{qr}}", qrSvg);
}

/**
 * Renders the certificate SVG. If `templateSvg` is provided (e.g. an admin-
 * defined SVG stored on `certificate_templates`), it's used; otherwise the
 * built-in default template from `./templates.ts` is used.
 */
export async function renderCertificateSvg(
  data: CertificateRenderData,
  templateSvg?: string | null,
): Promise<string> {
  const qr = await qrSvgFor(data.verification_url);
  const template = templateSvg ?? DEFAULT_CERTIFICATE_TEMPLATE;
  return applySubstitutions(template, data, qr);
}

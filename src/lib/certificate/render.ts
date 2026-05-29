import QRCode from "qrcode";

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

export const CERTIFICATE_WIDTH = 1000;
export const CERTIFICATE_HEIGHT = 700;

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

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Strips the XML prolog/doctype from the qrcode library output so it can be
 * nested inside the certificate SVG. */
function inlineQr(qrSvg: string): string {
  return qrSvg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .trim();
}

async function qrSvgFor(url: string, size: number): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: size,
    errorCorrectionLevel: "M",
  });
  return inlineQr(svg);
}

/**
 * Renders the certificate SVG. If `templateSvg` is provided (an admin-defined
 * template) its tokens are substituted; otherwise a built-in default is used.
 * Tokens: {{candidate_name}} {{course_title}} {{topics}} {{completion_date}}
 *         {{certificate_number}} {{verification_url}} {{qr}}
 */
export async function renderCertificateSvg(
  data: CertificateRenderData,
  templateSvg?: string | null,
): Promise<string> {
  const qr = await qrSvgFor(data.verification_url, 120);

  if (templateSvg) {
    const topicsText = data.topics.join(" · ");
    return templateSvg
      .replaceAll("{{candidate_name}}", escapeXml(data.candidate_name))
      .replaceAll("{{course_title}}", escapeXml(data.course_title))
      .replaceAll("{{topics}}", escapeXml(topicsText))
      .replaceAll("{{completion_date}}", escapeXml(formatLongDate(data.completion_date)))
      .replaceAll("{{certificate_number}}", escapeXml(data.certificate_number))
      .replaceAll("{{verification_url}}", escapeXml(data.verification_url))
      .replaceAll("{{qr}}", qr);
  }

  const topicsLine = data.topics.length
    ? `Topics covered: ${data.topics.join("  ·  ")}`
    : "";
  const topicLines = wrapText(topicsLine, 78);
  const topicsSvg = topicLines
    .map(
      (line, index) =>
        `<text x="500" y="${430 + index * 24}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="16" fill="#475569">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}">
  <rect width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" fill="#fafafa"/>
  <rect x="24" y="24" width="${CERTIFICATE_WIDTH - 48}" height="${CERTIFICATE_HEIGHT - 48}" fill="none" stroke="#3a4039" stroke-width="3"/>
  <rect x="36" y="36" width="${CERTIFICATE_WIDTH - 72}" height="${CERTIFICATE_HEIGHT - 72}" fill="none" stroke="#4b524a" stroke-width="1"/>

  <text x="500" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="4" fill="#4b524a">INVEST IN STRENGTH</text>
  <text x="500" y="185" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#23271f">Certificate of Completion</text>
  <line x1="380" y1="210" x2="620" y2="210" stroke="#4b524a" stroke-width="2"/>

  <text x="500" y="270" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#64748b">This certifies that</text>
  <text x="500" y="320" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#23271f">${escapeXml(data.candidate_name)}</text>

  <text x="500" y="375" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#64748b">has successfully completed</text>
  <text x="500" y="405" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#23271f">${escapeXml(data.course_title)}</text>
  ${topicsSvg}

  <text x="120" y="600" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#64748b">Date of completion</text>
  <text x="120" y="624" font-family="Georgia, 'Times New Roman', serif" font-size="18" fill="#23271f">${escapeXml(formatLongDate(data.completion_date))}</text>

  <text x="120" y="660" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#94a3b8">Certificate ID: ${escapeXml(data.certificate_number)}</text>

  <g transform="translate(760, 540)">${qr}</g>
  <text x="820" y="685" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#94a3b8">Scan to verify</text>
</svg>`;
}

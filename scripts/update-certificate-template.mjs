// One-off: rebuilds src/lib/certificate/templates.ts from the designer's
// SVG source file.
//
// Three steps:
//   1. Copy source SVG verbatim into public/brand/templates/.
//   2. Inline a cleaned variant into templates.ts:
//        - Strip XML prolog + Adobe generator comment.
//        - Replace the QR placeholder (designer wraps it in <text><tspan>
//          which is invalid for nesting another <svg>) with a transform-only
//          <g> at the QR slot's top-left.
//        - For variable-bearing text lines that should be visually centered
//          (participant name, course title, topics, issuer, url, date, cert
//          ID), set text-anchor="middle" and re-anchor the transform X to
//          the visual center of the intended layout area. Without this, a
//          longer substituted string pushes everything to the right instead
//          of expanding equally either side of the design's center point.
//   3. Write templates.ts.
//
// Run: node scripts/update-certificate-template.mjs
// Re-run any time the designer hands back a new SVG.

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const SOURCE_SVG =
  "A:/WORK/KUNDEN/Invest in Strength/Academy/certificate-template-03.svg";
const PUBLIC_DEST =
  "A:/WORK/_CLAUDE/_Projects/Invest-In-Strength/public/brand/templates/certificate-official-starter.svg";
const TS_DEST =
  "A:/WORK/_CLAUDE/_Projects/Invest-In-Strength/src/lib/certificate/templates.ts";

// Cert is A4 landscape, viewBox 0 0 841.89 595.28 (pt). The bottom-right
// "DATE OF COMPLETION" block sits under an underline from x=625.41 to
// x=758.64 — its visual center is the midpoint of that line.
const CERT_CENTER_X = 420.945; // 841.89 / 2
const DATE_BLOCK_CENTER_X = 691.825; // (625.41 + 758.64) / 2

/** Tokens whose containing <text> element should be center-anchored, paired
 *  with the X coordinate of the center the text should pivot around. */
const CENTERED_LINES = [
  { token: "{{participant_name}}", centerX: CERT_CENTER_X },
  { token: "{{course_title}}", centerX: CERT_CENTER_X },
  { token: "{{included_topics}}", centerX: CERT_CENTER_X },
  { token: "{{issuer_name}}", centerX: CERT_CENTER_X },
  { token: "{{verification_url}}", centerX: CERT_CENTER_X },
  { token: "{{completion_date}}", centerX: DATE_BLOCK_CENTER_X },
  { token: "{{certificate_id}}", centerX: DATE_BLOCK_CENTER_X },
];

function escapeRegex(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 1. Copy source SVG to the public/brand/templates/ folder verbatim.
//    This is the designer-editable reference (keeps all dashed indicators,
//    decorative groups, etc.). The in-repo runtime template gets the QR fix
//    and the centering post-process below.
copyFileSync(SOURCE_SVG, PUBLIC_DEST);
console.log(`copied source SVG -> public/brand/templates/certificate-official-starter.svg`);

// 2. Read source, strip XML prolog, fix QR placeholder.
let svg = readFileSync(SOURCE_SVG, "utf8");

// 2a. Strip XML prolog ("<?xml version=... ?>").
svg = svg.replace(/^\s*<\?xml[^?]*\?>\s*/g, "");

// 2b. Strip Adobe generator comments for tidiness.
svg = svg.replace(/<!--[\s\S]*?-->/g, "");

// 2c. Fix the QR placeholder. The designer wraps {{verification_qr}} in
//     <text class="st7" transform="translate(X Y)"><tspan ...>{{verification_qr}}</tspan></text>,
//     which produces invalid SVG when the placeholder is replaced with a
//     nested <svg>. Replace with a transform-only <g> positioned at the
//     QR slot's top-left so the QR fills the dashed-corner area.
const qrPattern =
  /<text\s+class="st7"\s+transform="translate\([^)]+\)"\s*>\s*<tspan[^>]*>\{\{verification_qr\}\}<\/tspan>\s*<\/text>/g;
const qrMatches = svg.match(qrPattern) ?? [];
if (qrMatches.length === 0) {
  console.error(
    "WARNING: QR text placeholder pattern not found — template may have changed shape. Inspect the SVG and update this script.",
  );
  process.exit(1);
}
svg = svg.replace(
  qrPattern,
  '<g id="qr-area-render" transform="translate(62.65 466.25)">{{verification_qr}}</g>',
);
console.log(`fixed ${qrMatches.length} QR placeholder(s)`);

// 2d. Center-anchor each variable-bearing text line. For each token, find
//     its containing <text> element, replace the transform X with the
//     intended center, and inject text-anchor="middle".
let centeredCount = 0;
for (const { token, centerX } of CENTERED_LINES) {
  const tokenEsc = escapeRegex(token);
  // Match a <text ...> element that contains the token in its body. Captures:
  //   1. attrs before the transform (may be empty)
  //   2. transform X value
  //   3. transform Y value
  //   4. attrs after the transform (may be empty)
  //   5. element body (between > and </text>)
  const pattern = new RegExp(
    `<text([^>]*?)\\s+transform="translate\\(([^ )]+)\\s+([^)]+)\\)"([^>]*)>([\\s\\S]*?</text>)`,
    "g",
  );
  let replaced = 0;
  svg = svg.replace(pattern, (full, attrs1, _xVal, yVal, attrs2, body) => {
    if (!body.includes(token)) return full;
    // Be defensive: don't double-inject text-anchor if it's already there.
    const alreadyAnchored = /\btext-anchor\s*=/.test(attrs1 + attrs2);
    const anchorAttr = alreadyAnchored ? "" : ' text-anchor="middle"';
    replaced += 1;
    return `<text${attrs1}${anchorAttr} transform="translate(${centerX} ${yVal})"${attrs2}>${body}`;
  });
  if (replaced === 0) {
    console.warn(`WARNING: token "${token}" not found in any <text> element.`);
  } else {
    centeredCount += replaced;
  }
}
console.log(`centered ${centeredCount} variable line(s)`);

// 2e. Trim leading/trailing whitespace.
svg = svg.trim();

// 3. Wrap as a TypeScript template literal. Escape any backticks and
//    ${ sequences in the SVG (defensive — SVGs don't typically have them).
const escaped = svg.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const ts = `/**
 * Built-in certificate template (A4 landscape, pt-scaled viewBox).
 *
 * Mirrors \`public/brand/templates/certificate-official-starter.svg\` — the
 * file the designer edits in Illustrator — with two automated fixes:
 *
 *   1. The \`{{verification_qr}}\` placeholder is moved out of its
 *      <text><tspan> wrapper (invalid for nesting an <svg>) into a
 *      transform-only <g> at the QR slot's top-left.
 *   2. Variable-bearing text lines that should be visually centered have
 *      \`text-anchor="middle"\` set and their transform X re-anchored to the
 *      intended center. Without this, a longer substituted string pushes
 *      everything to the right instead of expanding equally either side of
 *      the design's center point.
 *
 * Both fixes are applied by \`scripts/update-certificate-template.mjs\` —
 * the canonical rebuild path when the designer hands back a new SVG.
 *
 * Placeholder tokens substituted by the renderer (spec vocab + legacy aliases
 * both accepted):
 *   {{participant_name}} / {{candidate_name}} / {{certificate_display_name}}
 *   {{course_title}}
 *   {{included_topics}} / {{topics}}
 *   {{completion_date}}
 *   {{certificate_id}} / {{certificate_number}}
 *   {{verification_url}}
 *   {{issuer_name}}
 *   {{verification_qr}} / {{qr}}   — replaced with an inlined QR <svg>
 *
 * viewBox is \`0 0 841.89 595.28\` (pt; 1mm = 2.835pt → A4 landscape).
 * The QR slot is 63.08 × 63.08 pt (~22mm). The renderer generates the QR
 * with width=63 to fit; see \`src/lib/certificate/render.ts → qrSvgFor\`.
 */
export const DEFAULT_CERTIFICATE_TEMPLATE = \`${escaped}\`;

/** The issuer name printed on the certificate (and used by templates that
 * include \`{{issuer_name}}\`). */
export const ISSUER_NAME = "Invest in Strength";
`;

writeFileSync(TS_DEST, ts, "utf8");
console.log("wrote src/lib/certificate/templates.ts");
console.log(`  inline SVG length: ${svg.length} bytes`);

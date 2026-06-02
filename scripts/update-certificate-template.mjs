// One-off: rebuilds src/lib/certificate/templates.ts from the designer's
// SVG source file. Strips the XML prolog and fixes the QR placeholder
// (designer wraps it in <text><tspan> which is invalid for nesting another
// <svg>; we replace it with a transform-only <g> at the QR slot position).
//
// Run: node scripts/update-certificate-template.mjs
// Safe to delete after running.

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const SOURCE_SVG =
  "A:/WORK/KUNDEN/Invest in Strength/Academy/certificate-template-02.svg";
const PUBLIC_DEST =
  "A:/WORK/_CLAUDE/_Projects/Invest-In-Strength/public/brand/templates/certificate-official-starter.svg";
const TS_DEST =
  "A:/WORK/_CLAUDE/_Projects/Invest-In-Strength/src/lib/certificate/templates.ts";

// 1. Copy source SVG to the public/brand/templates/ folder verbatim.
//    This is the designer-editable reference (keeps all dashed indicators,
//    decorative groups, etc.). The in-repo runtime template (below) is a
//    cleaned variant that fixes the QR-area nesting.
copyFileSync(SOURCE_SVG, PUBLIC_DEST);
console.log("copied source SVG -> public/brand/templates/certificate-official-starter.svg");

// 2. Read source, strip XML prolog, fix QR placeholder.
let svg = readFileSync(SOURCE_SVG, "utf8");

// 2a. Strip XML prolog ("<?xml version=... ?>").
svg = svg.replace(/^\s*<\?xml[^?]*\?>\s*/g, "");

// 2b. Strip the Adobe generator comment for tidiness.
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
if (qrMatches.length > 1) {
  console.warn(
    `WARNING: ${qrMatches.length} QR placeholders matched; expected 1. Replacing all.`,
  );
}
svg = svg.replace(
  qrPattern,
  '<g id="qr-area-render" transform="translate(62.65 466.25)">{{verification_qr}}</g>',
);
console.log(`fixed ${qrMatches.length} QR placeholder(s)`);

// 2d. Trim leading/trailing whitespace.
svg = svg.trim();

// 3. Wrap as a TypeScript template literal. Escape any backticks and
//    ${ sequences in the SVG (defensive — SVGs don't typically have them).
const escaped = svg.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const ts = `/**
 * Built-in certificate template (A4 landscape, pt-scaled viewBox).
 *
 * Mirrors \`public/brand/templates/certificate-official-starter.svg\` — the
 * file the designer edits in Illustrator. One structural fix is applied
 * before inlining: the \`{{verification_qr}}\` placeholder is moved out of
 * its <text><tspan> wrapper (which is invalid for nesting an <svg>) and
 * placed inside a transform-only <g> positioned at the QR slot's top-left.
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
 *
 * Maintenance: when the designer hands back a new SVG, rebuild this file
 * with \`node scripts/update-certificate-template.mjs\` (the script lives
 * in git history if it was deleted after run).
 */
export const DEFAULT_CERTIFICATE_TEMPLATE = \`${escaped}\`;

/** The issuer name printed on the certificate (and used by templates that
 * include \`{{issuer_name}}\`). */
export const ISSUER_NAME = "Invest in Strength";
`;

writeFileSync(TS_DEST, ts, "utf8");
console.log("wrote src/lib/certificate/templates.ts");
console.log(`  inline SVG length: ${svg.length} bytes`);

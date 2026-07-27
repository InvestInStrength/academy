// Rebuilds the designer's seminar SVG into a usable template.
//
// The export has "convert text to outlines" enabled, so the {{...}} slots are
// vector glyph shapes, not text — there is no token for the renderer to
// substitute. This removes ONLY the glyph clusters that spell the placeholders
// (located geometrically, verified against the row map) and puts live Barlow
// text back at the same position, size and colour. Every other line — the
// headline, the series, "01 / 04", the seal, the signature, the artwork — is
// left byte-for-byte untouched.
//
// Also embeds the linked background photo as a data URI, since the renderer has
// no filesystem at issue time.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { collectShapes } from "./lib-outline-geometry.mjs";

const SRC =
  "A:/WORK/KUNDEN/Invest in Strength/Academy/Seminare/certificate-template-Shoulder-Biomechanics-01.svg";
const OUT =
  "C:/Users/miche/AppData/Local/Temp/claude/A--WORK--CLAUDE--Projects-Invest-In-Strength/ad1b246d-c298-4cd3-81c1-9f9a0ac45a60/scratchpad/seminar-template-rebuilt.svg";

const CENTER = 420.945;
const DATE_CENTER = 692.0;

/** Each placeholder: the region whose glyph outlines to delete, and the live
 * text to put back. `capTop` is the fraction of the em above the baseline for
 * the tallest glyph in the original run (the `{` brace), used to derive the
 * baseline from the measured top edge. */
const SLOTS = [
  {
    id: "participant_name",
    region: { x0: 255, x1: 585, y0: 275, y1: 315 },
    text: "{{participant_name}}",
    size: 34,
    weight: 700,
    family: "Barlow-Bold, Barlow",
    anchor: CENTER,
    capTop: 0.73,
  },
  {
    id: "verification_qr",
    region: { x0: 75, x1: 115, y0: 493, y1: 502 },
    qr: { x: 62.65, y: 466.25 },
  },
  {
    id: "completion_date",
    region: { x0: 618, x1: 765, y0: 486, y1: 506 },
    text: "{{completion_date}}",
    size: 15.59,
    weight: 700,
    family: "Barlow-Bold, Barlow",
    anchor: DATE_CENTER,
    capTop: 0.73,
  },
  {
    id: "certificate_id",
    region: { x0: 640, x1: 745, y0: 515, y1: 527 },
    text: "Certificate ID: {{certificate_id}}",
    size: 7.37,
    weight: 400,
    family: "Barlow-Regular, Barlow",
    anchor: DATE_CENTER,
    capTop: 0.73,
  },
  {
    id: "issuer_name",
    region: { x0: 350, x1: 490, y0: 521, y1: 535 },
    text: "{{issuer_name}}",
    size: 9.64,
    weight: 600,
    family: "Barlow-SemiBold, Barlow",
    anchor: CENTER,
    capTop: 0.73,
    letterSpacing: ".47em",
  },
  {
    id: "verification_url",
    region: { x0: 388, x1: 455, y0: 547, y1: 560 },
    text: "{{verification_url}}",
    // The designer sized this slot for the 20-char token "{{verification_url}}",
    // but a real URL is 88 chars (a 48-hex verification token). At the visual
    // size of the placeholder it renders 279pt into the 136pt gap in the bottom
    // rule and collides with both rule segments. 3.2pt is the largest size a
    // real URL fits in; textLength pins it to the gap for any future URL shape.
    size: 3.2,
    textLength: 128,
    weight: 400,
    family: "Barlow-Regular, Barlow",
    anchor: CENTER,
    capTop: 0.73,
  },
];

const raw = readFileSync(SRC, "utf8");

// --- embed the linked photo -------------------------------------------------

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
let svg = raw.replace(
  /((?:xlink:)?href\s*=\s*")([^"]+)(")/gi,
  (full, before, href, after) => {
    if (href.startsWith("data:") || href.startsWith("#")) return full;
    const file = resolve(dirname(SRC), decodeURIComponent(href));
    const mime = MIME[extname(file).toLowerCase()];
    if (!mime) return full;
    const b64 = readFileSync(file).toString("base64");
    console.log(`embedded ${href} (${Math.round(b64.length / 1024)} KB)`);
    return `${before}data:${mime};base64,${b64}${after}`;
  },
);

// --- locate and remove the placeholder glyph clusters ----------------------

const shapes = collectShapes(svg);
const inside = (box, r) =>
  box[0] >= r.x0 && box[2] <= r.x1 && box[1] >= r.y0 && box[3] <= r.y1;

const cuts = [];
for (const slot of SLOTS) {
  const hits = shapes.filter((s) => s.tag === "path" && inside(s.box, slot.region));
  if (hits.length === 0) {
    console.error(`! no glyphs found for ${slot.id} — region may be wrong`);
    process.exit(1);
  }
  slot.top = Math.min(...hits.map((h) => h.box[1]));
  slot.bottom = Math.max(...hits.map((h) => h.box[3]));
  slot.cls = hits[0].cls;
  console.log(
    `${slot.id.padEnd(18)} ${String(hits.length).padStart(3)} glyphs  ` +
      `y ${slot.top.toFixed(1)}-${slot.bottom.toFixed(1)}  class="${slot.cls}"`,
  );
  cuts.push(...hits.map((h) => ({ start: h.start, end: h.end })));
}

// Remove back-to-front so earlier offsets stay valid.
cuts.sort((a, b) => b.start - a.start);
for (const c of cuts) svg = svg.slice(0, c.start) + svg.slice(c.end);

// --- put live text back -----------------------------------------------------

const layer = SLOTS.map((slot) => {
  if (slot.qr) {
    return `<g id="qr-area-render" transform="translate(${slot.qr.x} ${slot.qr.y})">{{verification_qr}}</g>`;
  }
  const baseline = (slot.top + slot.capTop * slot.size).toFixed(2);
  const spacing = slot.letterSpacing ? ` letter-spacing="${slot.letterSpacing}"` : "";
  const fitted = slot.textLength
    ? ` textLength="${slot.textLength}" lengthAdjust="spacingAndGlyphs"`
    : "";
  return (
    `<text class="${slot.cls}" font-family="${slot.family}" font-weight="${slot.weight}" ` +
    `font-size="${slot.size}" text-anchor="middle"${spacing} ` +
    `x="${slot.anchor}" y="${baseline}"${fitted}>${slot.text}</text>`
  );
}).join("\n  ");

svg = svg.replace(/<\/svg>\s*$/, `  <!-- rebuilt variable layer -->\n  ${layer}\n</svg>`);

writeFileSync(OUT, svg, "utf8");
console.log(`\nwrote ${OUT} (${Math.round(svg.length / 1024)} KB)`);
console.log(
  `placeholders: ${[...new Set(svg.match(/\{\{[a-z_]+\}\}/g) ?? [])].join(" ")}`,
);

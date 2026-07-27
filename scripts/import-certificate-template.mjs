// Imports a designer SVG into `certificate_templates` so it can be assigned to
// a course or seminar in the admin.
//
//   node scripts/import-certificate-template.mjs <file.svg> "<template name>"
//
// What it does that a plain copy/paste into the admin form cannot:
//
//   1. INLINES LINKED IMAGES. Illustrator exports linked bitmaps as
//      `xlink:href="photo.jpg"` relative to the .svg. The renderer rasterises
//      the certificate server-side with no filesystem context, so a linked image
//      silently vanishes from the finished certificate. Each reference is read
//      from disk (relative to the SVG) and embedded as a `data:` URI. The admin
//      form cannot do this — the browser only has the .svg, not its siblings.
//
// It then applies the same normalisation and enforces the same invariants as the
// admin upload path, and REFUSES the import rather than storing a template that
// would produce broken certificates:
//
//   - no `{{placeholder}}` tokens — the signature of an export with "convert
//     text to outlines" enabled. The tokens are glyph outlines, so nothing can
//     be substituted and the certificate would print the literal `{{...}}`
//     shapes with no name, date or ID. Fix: re-export with live text (Barlow is
//     bundled with the renderer, so it looks identical).
//   - references it could not embed — those would just be missing from every
//     certificate, permanently, because the render is frozen into an immutable
//     snapshot.
//
// The helpers below intentionally mirror `src/lib/certificate/template-import.ts`
// and `admin/settings/templates/schema.ts`. They are duplicated because this is
// a plain .mjs script and those are TypeScript; keep them in sync when either
// side changes.
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Re-running with the same name updates that template in place.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [, , svgPath, templateName] = process.argv;

if (!svgPath || !templateName) {
  console.error(
    'usage: node scripts/import-certificate-template.mjs <file.svg> "<template name>"',
  );
  process.exit(1);
}

// --- env -------------------------------------------------------------------

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)",
  );
  process.exit(1);
}

// --- transform -------------------------------------------------------------

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const REFERENCE = /((?:xlink:)?(?:href|src)\s*=\s*["'])([^"']+)(["'])/gi;

/** Embeds every non-`data:` reference as a data URI, resolved relative to the
 * SVG. Unresolvable ones are left as-is and caught by the check further down. */
function inlineLinkedAssets(svg, baseDir) {
  return svg.replace(REFERENCE, (full, before, href, after) => {
    if (href.startsWith("data:") || href.startsWith("#")) return full;

    let decoded = href;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      // A bare `%` in a filename is not a valid escape sequence — use it raw.
    }

    const assetPath = resolve(baseDir, decoded);
    if (!existsSync(assetPath)) {
      console.error(`  ! linked asset not found: ${href}`);
      return full;
    }
    const mime = MIME[extname(assetPath).toLowerCase()];
    if (!mime) {
      console.error(`  ! unsupported linked asset type: ${href}`);
      return full;
    }
    const base64 = readFileSync(assetPath).toString("base64");
    console.log(`  inlined ${href} (${Math.round(base64.length / 1024)} KB base64)`);
    return `${before}data:${mime};base64,${base64}${after}`;
  });
}

function stripPrologAndComments(svg) {
  return svg
    .replace(/^\s*<\?xml[^?]*\?>\s*/g, "")
    // Handles a DOCTYPE with an internal entity subset — `[^>]*` alone stops at
    // the first `>` inside it and leaves a dangling `]>` before the root.
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/** Moves a `{{verification_qr}}` token out of its `<text>` wrapper into a
 * positioned `<g>`, carrying over `transform` and any `x`/`y`. */
function unwrapQrPlaceholder(svg) {
  const QR_TOKEN = /\{\{\s*(?:verification_qr|qr)\s*\}\}/i;
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (full, attrs, body) => {
    if (!QR_TOKEN.test(body)) return full;

    const attr = (source, name) => {
      const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(source);
      const value = match ? Number.parseFloat(match[1]) : NaN;
      return Number.isFinite(value) ? value : 0;
    };

    const transform = /transform\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "";
    const tspanAttrs = /<tspan\b([^>]*)>/i.exec(body)?.[1] ?? "";
    const x = attr(attrs, "x") + attr(tspanAttrs, "x");
    const y = attr(attrs, "y") + attr(tspanAttrs, "y");

    const parts = [transform, x || y ? `translate(${x} ${y})` : ""].filter(Boolean);
    return `<g${parts.length ? ` transform="${parts.join(" ")}"` : ""}>{{verification_qr}}</g>`;
  });
}

/** Strips active content, mirroring `sanitizeTemplateSvg` in the lib. */
function sanitizeTemplateSvg(svg) {
  let out = svg;
  for (const tag of ["script", "foreignObject", "handler", "listener"]) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(?:</${tag}\\s*>|$)`, "gi"), "");
    out = out.replace(new RegExp(`<${tag}\\b[^>]*/>`, "gi"), "");
  }
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(
    /\s(?:xlink:)?(?:href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\1/gi,
    "",
  );
  return out;
}

function externalReferencesIn(svg) {
  const refs = svg.match(/(?:xlink:)?(?:href|src)\s*=\s*(["'])([^"']*)\1/gi) ?? [];
  return [
    ...new Set(
      refs
        .map((ref) => ref.replace(/^[^"']*["']/, "").replace(/["']$/, ""))
        .filter((v) => v && !v.startsWith("#") && !v.startsWith("data:")),
    ),
  ];
}

function placeholdersIn(svg) {
  const found = svg.match(/\{\{\s*([a-z_]+)\s*\}\}/gi) ?? [];
  return [...new Set(found.map((token) => token.replace(/[{}\s]/g, "")))];
}

function refuse(message) {
  console.error(`\nREFUSING TO IMPORT: ${message}`);
  process.exit(2);
}

// --- run -------------------------------------------------------------------

const source = resolve(process.cwd(), svgPath);
if (!existsSync(source)) {
  console.error(`not found: ${source}`);
  process.exit(1);
}

console.log(`reading ${source}`);
const raw = readFileSync(source, "utf8");
console.log(`  ${Math.round(raw.length / 1024)} KB`);

const svg = sanitizeTemplateSvg(
  unwrapQrPlaceholder(
    stripPrologAndComments(inlineLinkedAssets(raw, dirname(source))),
  ),
);

const stillExternal = externalReferencesIn(svg);
if (stillExternal.length > 0) {
  refuse(
    `the template still references files that could not be embedded:\n` +
      stillExternal.map((ref) => `  - ${ref}`).join("\n") +
      `\n\nCertificates are rasterised server-side with no filesystem and no ` +
      `network, so these would be missing from every certificate issued from ` +
      `this template — permanently, because the render is frozen into an ` +
      `immutable snapshot. Put the referenced files next to the .svg so they ` +
      `can be embedded, or have the designer embed them in the export. ` +
      `(The admin upload form rejects the same SVG.)`,
  );
}

const placeholders = placeholdersIn(svg);
console.log(
  `  placeholders: ${placeholders.length ? placeholders.map((p) => `{{${p}}}`).join(" ") : "NONE"}`,
);

if (placeholders.length === 0) {
  refuse(
    `this SVG contains no {{placeholder}} tokens.\n\n` +
      `Every text element in it is vector outlines, so the renderer has nothing ` +
      `to substitute — the certificate would print the literal {{...}} shapes ` +
      `and no participant name, date or certificate ID.\n\n` +
      `Ask the designer to re-export WITHOUT "convert text to outlines" (at ` +
      `minimum the placeholder lines must stay as live text). Barlow is bundled ` +
      `with the renderer, so live text renders identically to the outlined version.`,
  );
}

if (!svg.startsWith("<svg")) {
  refuse(
    `after normalisation the file does not start with <svg — there is markup ` +
      `or a DOCTYPE remnant in front of the root element, which the rasteriser ` +
      `would reject.`,
  );
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing } = await client
  .from("certificate_templates")
  .select("id")
  .eq("name", templateName)
  .maybeSingle();

const row = {
  name: templateName,
  svg_template: svg,
  template_type: "official_certificate",
  active: true,
};

const { data, error } = existing
  ? await client
      .from("certificate_templates")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .single()
  : await client.from("certificate_templates").insert(row).select("id").single();

if (error) {
  console.error("failed:", error.message);
  process.exit(1);
}

console.log(
  `${existing ? "updated" : "created"} certificate_templates row ${data.id}`,
);
console.log(`assign it to a seminar under /admin/seminars → "${templateName}".`);

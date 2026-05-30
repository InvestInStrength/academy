/**
 * Built-in certificate template (mm-scale, A4 landscape).
 *
 * This is the production default used by `renderCertificateSvg` when no
 * admin-defined template is set on the questionnaire. It mirrors
 * `public/brand/templates/certificate-official-starter.svg` (kept there for
 * designer reference + future preview) with the design-rule comment block
 * and dashed placeholder rect stripped out for clean rendering.
 *
 * Placeholder tokens (the renderer substitutes these — both the spec vocab
 * and the legacy short names are accepted):
 *   {{participant_name}} / {{candidate_name}} / {{certificate_display_name}}
 *   {{course_title}}
 *   {{included_topics}} / {{topics}}
 *   {{completion_date}}
 *   {{certificate_id}} / {{certificate_number}}
 *   {{verification_url}}
 *   {{issuer_name}}
 *   {{verification_qr}} / {{qr}}   — replaced with an inlined QR <svg>
 *
 * Notes:
 *  - The template uses mm units (viewBox `0 0 297 210` → 1 unit = 1mm).
 *    The renderer generates the QR at 36mm to fit the `#qr-area` group.
 *  - When the client provides a final design (also at this scale), the
 *    designer just replaces the contents of this constant or stores the SVG
 *    in `certificate_templates.svg_template` and the renderer picks it up.
 */
export const DEFAULT_CERTIFICATE_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210" font-family="Barlow, sans-serif">
  <rect width="297" height="210" fill="#fafafa"/>
  <rect x="6" y="6" width="285" height="198" fill="none" stroke="#3a4039" stroke-width="0.7"/>
  <rect x="8" y="8" width="281" height="194" fill="none" stroke="#3a4039" stroke-width="0.15"/>
  <text x="148.5" y="22" text-anchor="middle" font-size="3.4" letter-spacing="1.6" font-weight="600" fill="#3a4039">{{issuer_name}}</text>
  <text x="148.5" y="52" text-anchor="middle" font-size="14" font-weight="800" fill="#23271f">Certificate of Completion</text>
  <line x1="125" y1="58" x2="172" y2="58" stroke="#3a4039" stroke-width="0.4"/>
  <text x="148.5" y="80" text-anchor="middle" font-size="4" fill="#5b6359">This certifies that</text>
  <text x="148.5" y="102" text-anchor="middle" font-size="12" font-weight="700" fill="#23271f">{{participant_name}}</text>
  <text x="148.5" y="122" text-anchor="middle" font-size="4" fill="#5b6359">has successfully completed</text>
  <text x="148.5" y="138" text-anchor="middle" font-size="7" font-weight="700" fill="#23271f">{{course_title}}</text>
  <text x="148.5" y="152" text-anchor="middle" font-size="3.6" fill="#4b524a">Topics covered: {{included_topics}}</text>
  <text x="22" y="184" font-size="3" letter-spacing="0.4" fill="#5b6359">DATE OF COMPLETION</text>
  <text x="22" y="190" font-size="5.5" font-weight="700" fill="#23271f">{{completion_date}}</text>
  <text x="22" y="198" font-size="2.6" fill="#9aa19a">Certificate ID: {{certificate_id}}</text>
  <text x="148.5" y="198" text-anchor="middle" font-size="2.6" fill="#9aa19a">{{verification_url}}</text>
  <g id="qr-area" transform="translate(235, 158)">{{verification_qr}}</g>
</svg>`;

/** The issuer name printed on the certificate (and used by templates that
 * include `{{issuer_name}}`). */
export const ISSUER_NAME = "Invest in Strength";

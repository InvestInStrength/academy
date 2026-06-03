# Slice 6 (Certificate Output System, MVP) — apply-before-deploy checklist

Scope shipped: **official PDF + matching PNG preview**, stored in Supabase
Storage, surfaced on the candidate certificate page + public verification page,
with admin **regenerate**. Instagram-story graphic is deferred until the social
SVG design is provided (schema + template_type already accommodate it).

The code is built and committed on `feat/slice-6-certificate-output` but **must
not be deployed until the two manual Supabase steps below are done** — the app
degrades gracefully if they aren't (certificates still issue; assets show as
"pending" and can be regenerated), but assets won't render until then.

## 1. Apply migration 0004 (live Supabase SQL editor)

Paste **only** the SQL from `supabase/migrations/0004_certificate_assets.sql`
into the SQL editor and run it. It is append-only and idempotent-friendly.
It creates `certificate_assets` (admin RLS), adds `template_type`/`width`/
`height` to `certificate_templates`, and leaves `certificates.file_url` unused.

## 2. Create the Storage bucket `certificates` (Supabase dashboard)

Storage → New bucket:
- **Name:** `certificates`
- **Public bucket:** ON (all assets are public-safe — same data as the public
  verification page; no private fields are ever rendered).
- Leave file-size limit default (PDFs/PNGs are a few MB at most).

No extra Storage RLS policies are needed: public read serves the assets, and
all writes go through the service-role client (which bypasses RLS).

## 3. Deploy

Merge `feat/slice-6-certificate-output` → `main` and push (Vercel builds prod
via the GitHub integration). The bundled Barlow fonts and the native resvg
package are configured in `next.config.ts` (`outputFileTracingIncludes` +
`serverExternalPackages`) to ship in the serverless functions.

## 4. Verify (after deploy)

- Pass a test candidate (or use an existing passed assignment + "Regenerate
  files" in admin). On the candidate certificate page you should see the PNG
  preview + **Download certificate (PDF)** + **Download PNG**.
- Open the public `/verify/<token>` page — it should show the official PNG
  preview image.
- Admin → participant detail → assignment: confirm the PDF/Preview links +
  **Regenerate files** button, and that the history timeline logs
  "Certificate files generated".
- **Visually check the rendered PDF/PNG** against the designer's intent
  (fonts/weights, name + topic placement, QR). The renderer normalizes the
  designer's per-weight `Barlow-*` font tokens to family `Barlow` + weights
  400/500/600/700/800 — confirm headings render bold as expected.

## 5. Backfill existing certificates

Certificates issued before this slice have no stored assets. Either leave them
(the candidate page falls back to the client-side SVG/PNG) or click **Regenerate
files** per certificate in admin to render + store their PDF/PNG.

## Notes / follow-ups

- Asset generation runs inline in the pass flow (best-effort): a render/upload
  failure never blocks issuing; it is logged (`certificate_generation_failed`)
  and surfaces as "pending — regenerate".
- Deferred (needs the social design): Instagram story 1080x1920 template +
  render + success-page download. `CertificateAssetType`/`CertificateTemplateType`
  and the migration already include the Instagram types.
- Email currently still attaches the SVG (existing behavior). Multi-attachment
  PDF email is a later follow-up per the spec.

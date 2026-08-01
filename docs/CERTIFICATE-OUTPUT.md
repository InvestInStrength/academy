# Certificate Output System — spec & architecture

Status: **partially built and live** (corrected 2026-08-01 — this header
previously said "planned", which was stale by two months).

- **Shipped:** official PDF + high-resolution PNG preview, rendered server-side
  (`@resvg/resvg-js` + `pdf-lib`) and stored in the public Supabase Storage
  bucket `certificates`, tracked in `certificate_assets`, with an admin
  "Regenerate files" action. See `src/lib/certificate/{generate,assets,storage}.ts`.
- **Not built:** the Instagram Story / feed / square formats (blocked on the
  client's social designs — decision D-21), the website badge, fit-to-box text
  shrinking, name-overflow warnings, template preview with sample data, and
  PDF-as-email-attachment (the certificate email still attaches the SVG).
- **Changed since this spec was written:** the implemented account_history
  events are `certificate_assets_generated` / `certificate_generation_failed`,
  not the `certificate_pdf_generated` / `certificate_preview_generated` named
  below.

This document remains the source of truth for the *remaining* scope; treat the
milestone plan in `docs/academy/07-milestone-backlog.md` (M5) as authoritative
for sequencing.

## Why
The audience pays for and is proud of these qualifications. After passing, a
candidate should receive (a) an **official certificate** for printing/archiving
and (b) a **polished social-share graphic** that celebrates the achievement and
is built to be posted. We use that pride as a growth/retention lever.

## Current vs. target

| | Current (Slice 4) | Target (this spec) |
|---|---|---|
| Output | one rendered SVG stored in `certificates.certificate_public_snapshot`; client-side PNG; SVG email attachment | **Official PDF**, **PNG preview**, **Instagram Story PNG** — server-rendered, stored in Supabase Storage |
| Assets per cert | one (implicit) | many → `certificate_assets` table |
| Templates | built-in default renderer; `certificate_templates` unused | typed templates per `template_type` (official + social), SVG source of truth |
| Storage | none (snapshot holds SVG) | Supabase Storage bucket, stable paths |

The **immutable data snapshot** (`certificate_public_snapshot`: display name,
course title, topics, completion date, certificate id, verification url, issuer)
remains the rendering source of truth and must not drift. The rendered SVG
currently embedded in the snapshot becomes redundant once assets are stored.

## A. Official PDF certificate
Primary official format. Generated immediately after passing. Print/archive/pro
use. Uses the **official** template.
- **Includes:** participant name OR admin-defined display name, main course title,
  included topics/subtopics, completion date, certificate ID, QR verification
  code, issuer branding.
- **Excludes:** score %, failed attempts, attempt count, email, admin notes,
  manual-pass reason.

## B. Certificate image preview (PNG)
PNG of the official certificate. Used for browser preview + the verification page;
downloadable. **Must visually match the PDF** — so it is rendered from the **same
filled SVG** as the PDF (see rendering).

## C. Instagram / social sharing PNG
A **separate celebratory graphic**, not a copy of the certificate. Premium, proud,
shareable. Generated immediately after passing; downloadable from the success
page and later via the personal link; optionally emailed.
- **Includes:** participant name / display name, course title, a "Certified" /
  "Successfully Certified" message, Invest in Strength branding, completion date,
  optional certificate ID, optional QR/verification URL (design-dependent).
- **Excludes:** score %, failed attempts, email, admin notes, exact wrong answers.
- **MVP size:** Instagram **Story 1080 × 1920**. Later: Feed Portrait 1080 × 1350,
  Square 1080 × 1080.

## Data model changes (append-only migration, e.g. `0002_certificate_assets.sql`)

> `0001` is already applied to the live project → all changes below are a NEW
> migration. Update `src/types/database.ts` to match in the same slice.

### New: `certificate_assets` (multiple assets per certificate)
```
certificate_assets
- id                uuid pk
- certificate_id    uuid not null fk -> certificates(id) on delete cascade
- asset_type        text not null check in (
                      'official_pdf','official_png_preview','instagram_story_png',
                      'instagram_feed_png','instagram_square_png')
- file_url          text not null        -- Supabase Storage public URL
- mime_type         text not null
- width             integer
- height            integer
- file_size         integer
- generated_at      timestamptz not null default now()
- created_at        timestamptz not null default now()
- unique (certificate_id, asset_type)    -- one current asset per type; regen overwrites the file + updates the row
```
RLS: admin-only (same `is_admin()` pattern). Public surfaces read assets via the
Storage public URL (or service-role in trusted server code), never via anon SQL.

### Update: `certificate_templates`
```
+ template_type   text not null default 'official_certificate' check in (
                    'official_certificate','instagram_story','instagram_feed','instagram_square')
+ width           integer
+ height          integer
```
MVP template types: `official_certificate`, `instagram_story`.

### `certificates`
- Keep `certificate_public_snapshot` (immutable data — rendering source of truth).
- `file_url` is **deprecated** by `certificate_assets`. Leave nullable/unused for
  now, or repoint to the `official_pdf` URL for convenience; do not rely on it.

### Storage
- Bucket: **`certificates`** (public — all assets are public-safe; same data as
  the public verification page). Stable paths:
  - `certificates/{certificate_id}/official.pdf`
  - `certificates/{certificate_id}/official-preview.png`
  - `certificates/{certificate_id}/instagram-story.png`
- Regeneration overwrites the file at the stable path AND updates the
  `certificate_assets` row + logs the event (never silent).

## Strict TypeScript types
```ts
export type CertificateAssetType =
  | "official_pdf" | "official_png_preview" | "instagram_story_png"
  | "instagram_feed_png" | "instagram_square_png";
export type CertificateTemplateType =
  | "official_certificate" | "instagram_story" | "instagram_feed" | "instagram_square";
```
No hardcoded single design in business logic — the rendering layer takes a
template + data and produces assets.

## Rendering architecture (server-side only)
Keep the rendering layer **separate** from questionnaire/scoring logic and from
template storage. SVG is the source of truth; the client provides designs as SVG.

Flow:
- **Official PDF:** SVG template → filled SVG → high-DPI PNG (resvg) → embed into a
  correctly-sized PDF page (pdf-lib). *(Raster PDF = pixel-perfect match to the
  preview, robust. A vector PDF via `svg-to-pdfkit` is a later option if
  selectable text/true vector is required.)*
- **Official PNG preview:** the **same filled SVG** → PNG (resvg). Guarantees B
  matches A.
- **Instagram story:** separate IG-story SVG template → filled SVG → PNG at
  1080 × 1920 (resvg).

Recommended libraries (Node runtime, not Edge): **`@resvg/resvg-js`** (SVG→PNG),
**`pdf-lib`** (assemble PDF), existing **`qrcode`** (QR as inline SVG/PNG).

**Fonts gotcha:** resvg does not use `next/font`; it needs the **Barlow font
files** bundled in the repo and loaded explicitly, or text won't render in the
brand font. Add Barlow `.ttf`/`.woff` to a server fonts dir as a setup step.

## Template placeholders
`{{participant_name}}`, `{{certificate_display_name}}`, `{{course_title}}`,
`{{included_topics}}`, `{{completion_date}}`, `{{certificate_id}}`,
`{{verification_url}}`, `{{verification_qr}}`, `{{issuer_name}}`.
All text values are XML-escaped before injection. `{{verification_qr}}` is the
inlined QR SVG.

## Long-text safety (required)
- **Admin-defined display name:** use `certificate_display_name` when the full
  name is too long for the design.
- **Name-length warning:** admin UI warns when the name likely overflows the
  template's name box.
- **Fit-to-box font sizing:** name (and other constrained fields) shrink font size
  to fit a max-width box, down to a min size, then truncate with ellipsis.
- **Topics:** wrap into lines within a box; cap lines / show "+N more"; the social
  graphic may show fewer or no topics by design.
- **Template preview with sample data:** admin can render any template with sample
  long-name/long-topic data to check overflow before issuing.
- **Safe fallback:** if an asset fails to render, the certificate **still issues**
  (ID/token are valid); the failed asset is logged (`certificate_generation_failed`)
  and shown as "pending/failed — regenerate"; the success page degrades gracefully
  to whatever rendered.

## Account history events (extend vocabulary)
`certificate_pdf_generated`, `certificate_preview_generated`,
`certificate_social_asset_generated`, `certificate_pdf_downloaded`,
`certificate_social_asset_downloaded`, `certificate_assets_emailed`,
`certificate_generation_failed`. (`event_type` is free text → no schema change.)

## Participant success page (achievement, not a quiz result)
Sections:
1. Congratulations / certified state
2. Official certificate download (PDF) + View certificate (preview)
3. Instagram sharing graphic download
4. Send to email
5. Verification information (ID + verify link)
6. Same-link access reminder

Copy direction: "Congratulations, you are certified." · "Your official certificate
is ready." · "Download your certificate as PDF." · "Share your achievement with
your community." · "Download Instagram Story graphic."

## Same personal access link (later visits)
Shows: passed status · certificate (preview) · PDF download · Instagram PNG
download · email/send-again.

## Verification page (public)
Shows: validity state (valid/revoked) · certificate data · **official PNG preview
image**. Never: score, email, failed attempts, wrong answers, admin notes,
manual-pass reason.

## Admin — candidate detail certificate section
certificate status · certificate ID · generated assets list · official PDF
download · PNG preview · Instagram story PNG download · email-sent status · asset
generation status · **regenerate assets** · revoke certificate · account history.

## Regeneration
Regenerating assets **preserves the same `certificate_number` + `verification_token`**
(QR and links stay valid) — only an explicit revoke/reissue changes identity.
Regeneration re-renders, overwrites files at stable paths, updates
`certificate_assets`, and **logs** each generation (no silent overwrite).

## Email (future — data-model-ready only; do NOT build here)
When implemented, send: official PDF (+ optional preview + optional IG story).
Message: congratulations, certification success, certificate access, optional
encouragement to share. Build only after email infra is stable (Resend is wired,
but multi-attachment + achievement template is a follow-up).

## Security / privacy
- Social/preview/PDF are **public-facing** → must contain **no** private data
  (no email, score, attempts, wrong answers, admin notes, manual-pass reason).
- Any embedded QR/verification URL points only to the **public verification page**.
- Asset generation is **server-side**; the **service-role key never reaches the
  browser**.
- Stable storage paths; never overwrite silently without logging; clear error
  states on failure.

## Open decisions (resolve at slice start)
- Vector PDF (selectable text) vs raster PDF (MVP). Recommend raster for MVP.
- Public Storage bucket vs signed URLs (recommend public — assets are public-safe).
- Whether the IG story embeds the QR (design-dependent — needs the social design).
- Source of the official + social **SVG designs** (client to provide).

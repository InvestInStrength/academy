# Invest in Strength — Roadmap & Slice Plan

Living plan. Updated 2026-05-29 after the independent Codex audit
(`AUDIT_FOR_CLAUDE.md`). Read that file for the full findings; this file is the
actionable slice breakdown.

## Locked decisions (2026-05-29)

These were confirmed with the client/developer and drive the schema:

1. **Admin provisioning:** Superadmin-only, in-app. Remove the auto-admin
   trigger entirely. A `superadmin` creates other admins from inside the app.
   `requireAdmin()` must verify `admin_profiles` membership.
2. **Assignment uniqueness:** One **active** assignment per
   `(participant_id, questionnaire_id)`. Partial unique index
   `where active = true`. A participant may hold assignments for different
   questionnaires.
3. **Locking model:** Once a questionnaire has any assignment, its structure
   (question set, options, course) is **locked**. Editing requires duplicating
   to a new version. Attempts still snapshot what was shown.
4. **Certificate topics:** **Manually selected per assignment** via a normalized
   `certification_assignment_topics` join table (drop the `included_topic_ids`
   uuid[] array). Snapshot the chosen topic titles onto the certificate at issue.

Still open (decide when we reach the relevant slice, not blocking now):
- Verification page: stored rendered document vs regenerated data vs both (Slice 5).
- Whether manual-pass certificates are visually distinguishable (Slice 4).

## Status

- ✅ **Slice 1 — Foundation + admin content CRUD.** Done.
- ✅ **Slice 1.5 — Foundation Hardening.** Done (2026-05-29): auto-admin removed +
  superadmin admin management; `requireAdmin`/`requireSuperadmin` verify
  membership; `account_history` immutable; archive-first guarded deletes;
  topic↔course + question↔questionnaire-course + locking triggers; schema
  decisions applied (assignment uniqueness, `certification_assignment_topics`,
  certificate snapshot, dropped `allow_participant_name_entry`); README done.
  Deferred (tracked): full RPC transactionalization, automated tests,
  login/endpoint rate limiting (Slice 3).
- ✅ **Slice 2 — Participants & Certification Assignments.** Done (2026-05-29):
  participant CRUD + account-history logging; assignment creation as the central
  workflow (active questionnaire + manual included topics; one-active-per-
  participant/questionnaire enforced); access link display + copy + regenerate;
  deactivate/reactivate; per-assignment certificate-topic editing; candidate
  detail page with account-history timeline. Creating an assignment locks its
  questionnaire (Slice 1.5 triggers). No candidate-facing UI yet.
- ✅ **Slice 3 — Public candidate attempt flow + scoring.** Done (2026-05-29):
  `/certification/[accessToken]` hub (constant-shape neutral page for invalid OR
  inactive tokens, email gate before first attempt, latest-result summary,
  start/retake); `/attempt` server-rendered shuffled form (honours both shuffle
  toggles); `/result` shows latest only (% + pass/fail + topic recommendations on
  fail — never wrong questions/correct answers/history). Tamper-safe grading
  (correctness recomputed from DB by id; submitted order only feeds the
  snapshot). Full per-attempt snapshots in `attempts` + `attempt_answers`.
  Service-role DTO access with explicit field selection (no `select("*")`).
  In-memory rate limiting on email/attempt/login + login.
  **Deferred:** durable rate-limit store (Upstash) before production; real email
  verification (currently trust-on-submit); certificate access on pass = Slice 4.
- ✅ **Slice 4 — Certificate generation.** Done (2026-05-29): SVG certificate
  (course + included topics + name + date + cert ID + embedded QR; **no score**)
  rendered + frozen into `certificate_public_snapshot` at issue (immutable);
  auto-issued on candidate pass and on **manual pass** (reason required,
  backend-only, logged); candidate certificate page with **SVG + client-side PNG
  download**; **public `/verify/[verificationToken]`** showing document + data +
  valid/revoked status (never email/score/attempts/admin notes); admin
  certificates list + **revoke/reinstate** (reason backend-only). Decisions:
  verification serves the snapshot document+data; manual-pass certs are **not**
  visually distinguishable.
  **Deferred:** server-side PNG/PDF + Supabase Storage upload (currently
  client-side PNG + on-page SVG); admin certificate-template CRUD (default
  renderer used).
- ✅ **Slice 5 — Email delivery (Resend) for certificates.** Done (2026-05-29):
  server-only `sendCertificateEmail` (HTML summary + verify-link button + SVG
  attachment; key read lazily so the app works unconfigured); candidate
  "Email me my certificate" (token, rate-limited) + admin "Email to candidate";
  both block revoked certs, set `certificates.emailed_at`, log
  `certificate_emailed`. Verify-by-ID: `/verify` lookup form → canonical
  `/verify/[token]`; landing copy aligned + Verify link.
  **Deferred:** real email-verification step for candidates (still
  trust-on-submit); durable rate-limit store.

### MVP slice sequence (1–5) complete
All originally-planned MVP slices are built and verified end-to-end against a live
Supabase project + Resend domain (2026-05-29).

**🎨 TOP PRE-LAUNCH ITEM — UI/UX + functionality sweep (client-flagged 2026-05-29).**
The flows work, but design and functional polish need a dedicated pass across all
surfaces: admin (dashboard, courses/topics, question bank, questionnaire builder,
participants, certificates, settings/admins), candidate (hub, email gate, attempt,
result, certificate), and public verification. Treat as its own slice before
launch — visual design, layout/spacing, empty states, loading/pending states,
error messaging, mobile responsiveness, and any rough functional edges.

**📜 PLANNED FEATURE SLICE — Certificate Output System (scope expanded
2026-05-30).** Upgrade certificate output from one SVG/client-PNG to **official
PDF + PNG preview + Instagram Story PNG**, stored in Supabase Storage via a new
`certificate_assets` table, with typed templates per `template_type`. Full spec:
**`docs/CERTIFICATE-OUTPUT.md`**. See "Slice 6" below. This is a headline value
feature for this (proud, paying) audience — pre-launch, after the UI/UX sweep.

Other remaining cross-cutting hardening items (not new slices):
- Durable rate-limit store (Upstash/Redis) — replace the in-memory stopgap.
- Server-side PNG/PDF rendering + Supabase Storage upload (currently client-side
  PNG + on-page/attached SVG).
- Admin certificate-template CRUD (default renderer used today).
- Automated tests — **started 2026-05-29**: Vitest with 22 unit tests for the
  scoring engine + key Zod schemas (`pnpm test`). Still to add: server-action
  parsing and DB-invariant/integration tests.
- Candidate email verification (currently trust-on-submit).
- End-to-end QA against a real Supabase project (everything so far is verified at
  the type/build/route level only).
- **Persist partial attempt progress** (added 2026-06-02). After
  pagination shipped (`feat(candidate): paginated attempt …`,
  `157c667`), reload mid-attempt still loses in-page answer state —
  state is held client-side in the AttemptForm component, so a refresh
  resets it. Fix shape: add `attempts.answers jsonb` (e.g.
  `{[questionId]: optionId[]}`), persist on every answer-toggle via a
  small `saveAttemptProgress` server action (rate-limited like the
  attempt action), hydrate state from the row on render. Snapshot at
  submit-time is unchanged. Migration is append-only (single nullable
  column). Worth landing before the platform goes live to real
  candidates so a connection blip doesn't void 30 minutes of work.

Migration note: `0001_core_schema.sql` **is now applied to the live Supabase
project (2026-05-30)**. From here, all schema changes are **append-only
migrations** (no in-place edits to `0001`).

Migration numbering (live):
- `0002_platform_settings_and_attempt_language.sql` — **Slice 7a — Multilanguage
  foundation** (2026-06-01). See `docs/slice-7a-plan.md`.
- `0003_localized_content_columns.sql` — **Slice 7b — Multilanguage content
  schema** (2026-06-01). Adds `_de`/`_en` text columns to courses, topics,
  questions, options, questionnaires; backfills `_de` from the legacy
  column; updates `guard_questions_update` to include the new columns in
  the locked-content check.
- `0004+` — reserved for **Slice 6 Certificate Output System**. Slice 6
  ships with multilanguage hooks built in (cert snapshot includes
  `language`, renderer + email accept locale, verification renders from
  snapshot language) — see `docs/codex-audit-multilanguage.md` §1.9.

---

## ✅ Slice 7 — Multilanguage (DE-first) — FULLY SHIPPED 2026-06-01

Slice 7 closed end-to-end across six sub-slices (7a foundation, 7a-plus
superadmin UI, 7b content schema, 7c reads + dual-write + dual-input
forms, 7d UI string harvest, 7d-rest finish bilingual admin chrome).
The platform now serves German by default with English as a dormant
second slot that the superadmin can enable at any time. Locked rules:
the capability stays invisible to every surface except the superadmin
account; in-progress attempts freeze their language; frozen snapshots
remain immutable.

**Canonical reference — the state of the art, every wired surface, known
gaps, and how to extend or add a third locale — lives in
`docs/multilanguage-state.md`.** Read that before:
- Touching any i18n surface.
- Adding a new admin or candidate page.
- Adding a new translatable content field.
- Starting Slice 6 (cert renderer + email + verification have explicit
  language-hook requirements documented in §11 there and in the Codex
  audit §1.9).

Known English-only residue (intentional; doesn't block the German
launch): Zod inline schema messages, server-action `FormState.message`
returns, `account_history.event_label`, and cert/email chrome owned
by Slice 6. Each has a small bounded playbook in
`docs/multilanguage-state.md` §8.

---

## Slice 1.5 — Foundation Hardening (gate)

Ordered by the audit's priority. Schema items fold into a revised `0001`.

### A. Auth & admin model (Critical #1, #2)
- Remove the `handle_new_admin()` trigger and `on_auth_user_created`.
- Use the `role` column: `admin` vs `superadmin`. Add `active boolean` to
  `admin_profiles` so admins can be disabled without deleting audit trails.
- `requireAdmin()` → after `getUser()`, load `admin_profiles` and reject if no
  active row. Add `requireSuperadmin()`.
- Superadmin-only admin-management UI (`/admin/settings/admins` or similar):
  list admins, create admin (server action using service-role
  `auth.admin.createUser` + insert `admin_profiles`, **superadmin-gated**),
  deactivate/reactivate, change role.
- Bootstrap doc: how to create the first superadmin (create the auth user, then
  insert the `admin_profiles` row with role `superadmin`).
- Note: add login + public-endpoint rate limiting in Slice 3/5 (tracked below).

### B. Audit history immutability (Critical #3)
- `account_history`: replace the `for all` policy with **insert + select only**.
  Add a trigger that raises on UPDATE/DELETE (defense in depth).
- Define the event vocabulary as a constant/check (the list in the migration
  comment) so writers stay consistent.
- All backend-only reasons (manual pass, revoke, email-sent, deactivate/
  reactivate) are written **only** as history events.

### C. Replace destructive deletes (Critical #4)
- Normal admin UI: replace hard delete with **archive/deactivate** for courses,
  topics, questions, questionnaires.
- Allow hard delete **only for unused drafts**, with explicit checks
  (e.g. question not used in any questionnaire; questionnaire with no
  assignments; course with no questionnaires/assignments).
- Revisit cascades: keep `CASCADE` only where it is safe; use `RESTRICT` /
  `SET NULL` where certification/audit data must survive.

### D. Questionnaire integrity (High #1, #2; Medium #3)
- Require **≥ 1 question** for an *active* questionnaire (server + ideally DB).
  Zero allowed only while inactive/draft.
- Reject **inactive** questions for new selection (UI disables them; server
  validates). Already-selected inactive questions stay visible but locked.
- Add explicit **question reorder** UI driving `sort_order` (or a documented
  fixed ordering rule).

### E. Relational integrity in the DB (High #3, #4)
- Enforce `questions.topic_id` belongs to `questions.course_id` (trigger, or a
  composite-key FK: add `unique (id, course_id)` and reference it).
- Enforce `questionnaire_questions.question_id` shares the questionnaire's
  course (trigger/composite FK). Keep the existing server check as a UX layer.
- Attempt sanity constraints: `attempt_number > 0`,
  `score_percentage between 0 and 100`, `correct_count >= 0`, `wrong_count >= 0`.

### F. Locking / versioning (High #7; decision = lock)
- Block structural edits to a questionnaire once it has any assignment (server
  action guard + DB trigger). Provide a **"Duplicate"** action to create an
  editable copy/version.
- A question used by an assigned (locked) questionnaire is also locked for
  structural edits; to change it, duplicate the question.
- Stop the question-options **delete+reinsert** pattern for used questions; it is
  fine only for unlocked drafts.

### G. Schema changes from locked decisions (High #5, #6; Medium #4; Cert)
- **Remove** `certification_assignments.allow_participant_name_entry`
  (contradicts "participant cannot change name").
- Add partial unique index:
  `unique (participant_id, questionnaire_id) where active = true`.
- **Drop** `included_topic_ids uuid[]`; add `certification_assignment_topics`
  (`assignment_id`, `topic_id`, `sort_order`).
- Certificates: add immutable public snapshot — `certificate_public_snapshot`
  JSONB **or** explicit columns (`display_name`, `course_title`,
  `topic_titles[]`, `completion_date`). Public verification reads the snapshot,
  never live records.

### H. Reliability (Medium #1, #2)
- Move multi-step writes into Postgres RPC functions (transactional): create
  question+options, replace options, create questionnaire+links, replace links,
  create assignment+topics.
- Surface query `error` in admin UI instead of `data ?? []` swallowing.

### I. Types & docs (Medium #5, #6)
- Replace the default `README.md` with project setup, env, migration, admin
  bootstrap, security notes, and slice status.
- Plan to adopt `supabase gen types` once connected; until then keep
  `src/types/database.ts` in sync with the migration (note in CLAUDE.md).

### J. Tests (Low)
- Add unit tests for Zod schemas and server-action FormData parsing.

**Exit criteria for Slice 1.5:** no auto-admin; `requireAdmin`/`requireSuperadmin`
enforce membership; `account_history` immutable; no destructive deletes in normal
UI; questionnaire/question/topic/course integrity enforced in DB; assigned
content locked; schema decisions (2,4) applied; certificate snapshot fields exist;
README done.

---

## Slice 2 — Participants & Certification Assignments

Prove the app is **assignment-centered** before any candidate-facing flow.

- Participant CRUD: `full_name` (admin-set, immutable by candidate), optional
  `certificate_display_name`. Email is captured later by the candidate.
- **Assignment creation = the central workflow:** pick participant + an *active,
  locked-eligible* questionnaire → generate unguessable `access_token` → set
  active. Enforce one-active-per-(participant, questionnaire).
- Manual **included-topic selection** per assignment (the new join table).
- Access link controls: copy; optional regenerate (new token → logged in history).
- Account-history events (append-only): `participant_created`,
  `assignment_created`, `assignment_deactivated`, `assignment_reactivated`,
  `access_link_regenerated`.
- Admin **candidate detail page shell** (full attempt insight comes in Slice 3).
- No candidate-facing UI yet.

---

## Slice 3 — Public candidate attempt flow + scoring

Define the JSON shapes **first**: `attempt_snapshot`, `recommendation_snapshot`,
`question_snapshot`, `selected_option_snapshots`, `displayed_option_order`.

- `/certification/[accessToken]` (email capture before first attempt),
  attempt run with shuffle honored, full snapshot per attempt.
- Scoring against `passing_percentage`; unlimited retries; every attempt saved.
- `/certification/[accessToken]/result` shows **only**: latest %, pass/fail,
  topic-level recommendations on failure, certificate access on pass.
- Public/candidate queries must **never** expose: exact wrong questions, correct
  answers, full attempt history, admin notes, email.
- Service-role public reads use explicit DTO helpers — **no `select("*")`**.
- Add rate limiting + constant-shape responses on token/attempt endpoints (token
  probing defense). Add login rate limiting here too.

## Slice 4 — Certificate generation

- Immutable certificate number/ID + `verification_token`; render from SVG
  template; export PNG; QR linking to the verification page.
- Write the certificate public snapshot at issue (display name, course title,
  topic titles+order, completion date, template version).
- Manual-pass writes a `manual_pass` history event (reason backend-only).
- Download. Decide manual-pass visual distinguishability here.

## Slice 5 — Email + public verification

- Resend transactional email for certificate send; log `certificate_emailed`.
- `/verify/[certificateId]` reads the **snapshot** only and shows certificate
  document + data + valid/revoked status — nothing else. Strict field allow-list.
- Align public "verify by certificate ID" copy with the actual token/ID scheme.

## Slice 6 — Certificate Output System

**Status: MVP built 2026-06-03** on `feat/slice-6-certificate-output` (not yet
deployed — needs the two manual Supabase steps in
`docs/slice-6-apply-checklist.md`). Shipped: official **PDF** + matching **PNG
preview**, server-rendered (resvg + pdf-lib) from the frozen snapshot SVG,
stored in the Supabase `certificates` bucket via `certificate_assets`
(migration 0004); surfaced on the candidate certificate page + public
verification page; admin **regenerate** + asset links on participant detail;
graceful fallback to the client SVG/PNG when assets are pending/failed; bundled
Barlow fonts for resvg. **Deferred:** the Instagram-story 1080x1920 graphic
(part C) until the client provides the social SVG design — schema + type unions
already accommodate it. Steps 7-13 below (official PDF, PNG preview, Storage,
success page, verification image, admin regenerate) are done; step 4/9 (IG
story) is the deferred remainder.

Full spec: **`docs/CERTIFICATE-OUTPUT.md`**. Upgrades the existing (working)
certificate from a single SVG/client-PNG to three server-rendered, stored assets:
**official PDF**, **official PNG preview**, **Instagram Story PNG (1080×1920)**.

**When to implement (recommendation):** *after* the UI/UX sweep and *after* the
client provides the official certificate + social SVG designs; **pre-launch**
(it's a core motivation/retention feature for this audience). It builds on the
stable Slice 1–5 foundation and only adds infra (Supabase Storage + server-side
rendering deps) — it does not block on, and is not blocked by, anything except
those design assets + a Storage bucket. Do not start until explicitly asked.

Steps:
1. Migration `0002`: add `certificate_assets`; add `template_type` + `width` +
   `height` to `certificate_templates`; deprecate `certificates.file_url`.
2. Update `src/types/database.ts` + add `CertificateAssetType` /
   `CertificateTemplateType` unions.
3. Official certificate SVG template support (typed, with placeholders).
4. Instagram Story SVG template support (1080×1920).
5. Placeholder replacement (XML-escaped) + long-text fit/wrap strategy.
6. QR generation into templates (reuse `qrcode`).
7. Generate official **PDF** (resvg PNG → pdf-lib page; raster MVP).
8. Generate official **PNG preview** (same filled SVG → resvg).
9. Generate **Instagram Story PNG** (separate template → resvg, 1080×1920).
10. Store all assets in **Supabase Storage** (`certificates` bucket, stable paths).
11. Achievement-style **success page**: PDF download, view, IG-story download,
    email, verification info, same-link reminder.
12. Same personal link later: passed status + all asset downloads + send-again.
13. Verification page shows the **official PNG preview**.
14. Admin candidate detail: all assets, statuses, downloads, **regenerate**, revoke.
15. Log generation/download/email/failure events in `account_history`.
16. Regeneration preserves certificate ID/token; never overwrites silently.

Constraints (see spec): server-side rendering only; service-role key never in the
browser; no admin/private data in public assets; stable paths; clear failure
states; rendering layer separate from scoring; strict TS types; no single design
hardcoded in business logic. Bundle **Barlow font files** for resvg (it doesn't
use `next/font`).

Prereqs before this slice: ✅ certification engine + basic certificate (done) ·
client-provided official + social **SVG designs** · Supabase **Storage** bucket ·
deps (`@resvg/resvg-js`, `pdf-lib`).

## Cross-cutting (track across slices)
- Rate limiting (login, token, attempt).
- Generated Supabase types.
- Error surfacing + server-side logging.
- Tests for schemas, actions, and critical DB invariants.

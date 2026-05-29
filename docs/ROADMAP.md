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
All originally-planned MVP slices are built. Remaining before public launch are
cross-cutting hardening items, not new slices:
- Durable rate-limit store (Upstash/Redis) — replace the in-memory stopgap.
- Server-side PNG/PDF rendering + Supabase Storage upload (currently client-side
  PNG + on-page/attached SVG).
- Admin certificate-template CRUD (default renderer used today).
- Automated tests (schemas, server-action parsing, DB invariants).
- Candidate email verification (currently trust-on-submit).
- End-to-end QA against a real Supabase project (everything so far is verified at
  the type/build/route level only).

Migration note: `0001_core_schema.sql` is **not yet applied to any Supabase
project**, so Slice 1.5 will **revise 0001 in place** (cleaner than stacking a
corrective `0002`). Once it is applied to a real environment, switch to
append-only migrations.

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

## Cross-cutting (track across slices)
- Rate limiting (login, token, attempt).
- Generated Supabase types.
- Error surfacing + server-side logging.
- Tests for schemas, actions, and critical DB invariants.

# Invest in Strength - Audit for Claude

Date: 2026-05-29
Project: Invest in Strength certification platform
Domain: investinstrength.academy

This file summarizes an independent Codex audit of the current Slice 1 foundation.
No application fixes were implemented as part of this audit. Use this as a build
guide before continuing with Claude.

## Executive Summary

The current foundation is a reasonable early admin-content scaffold, but it is
not safe to continue into public questionnaire attempts or certificate issuance
until several schema and security issues are fixed.

The project is mostly framed correctly as a certification platform rather than a
generic quiz app. The schema already includes participants, certification
assignments, attempts, certificates, and account history. The admin UI supports
courses, topics, question bank, and questionnaires.

The main problems are:

- Admin authorization is too broad.
- Audit history is mutable.
- Core content can be hard-deleted.
- Several product invariants are not enforced in the database.
- Certificate records do not snapshot public certificate data.
- Question/questionnaire editing is not yet safe once assignments or attempts
  exist.

Verification during audit:

- `pnpm.cmd typecheck` passed.
- `pnpm.cmd lint` passed.
- `pnpm.cmd build` passed with dummy Supabase env values.
- No real secrets were found in committed files.

## What Appears Implemented

- Next.js 16 App Router project.
- Tailwind CSS v4 base styling.
- Supabase browser/server/proxy/service-role helpers.
- `.env.local.example`.
- Protected admin layout.
- Supabase Auth login page.
- Admin dashboard shell.
- Course CRUD.
- Topic CRUD inside courses.
- Question bank CRUD:
  - course assignment
  - optional topic assignment
  - answer options
  - correct answer marking
  - active/inactive state
  - explanation
  - recommendation text
- Questionnaire builder:
  - create/edit questionnaire
  - select course
  - select questions
  - passing percentage
  - shuffle question order toggle
  - shuffle answer order toggle
  - active/inactive state
- Placeholder admin pages for participants, certificates, and settings.
- Core migration for future assignments, attempts, certificates, and account
  history.

Not implemented yet, and acceptable for Slice 1:

- Public candidate access link flow.
- Email capture before first attempt.
- Attempt submission and scoring.
- Attempt snapshot creation.
- Candidate latest-result page.
- Certificate rendering.
- QR code generation.
- Certificate download/email.
- Public verification page.
- Participant/assignment admin details.

## Critical Blockers

### 1. Every Supabase Auth user becomes an admin

File: `supabase/migrations/0001_core_schema.sql`

The trigger `handle_new_admin()` inserts every new `auth.users` row into
`admin_profiles`. If Supabase public signup is enabled in any environment, any
person can create an account and become an admin.

Fix before continuing:

- Disable public signup in Supabase for every environment, and document it.
- Prefer removing auto-admin provisioning entirely.
- Replace it with explicit admin invitations, a fixed allowlist, or a
  superadmin-only admin creation flow.

### 2. `requireAdmin()` only verifies authentication

File: `src/lib/auth/admin.ts`

`requireAdmin()` calls `supabase.auth.getUser()` and redirects if no user is
present. It does not explicitly verify that the user has an admin profile.

RLS currently blocks data access for non-admin users, but the application shell
still treats any authenticated user as an admin. That is not a good security
boundary and will get worse as service-role flows are added.

Fix before continuing:

- After `getUser()`, query `admin_profiles` for the user id.
- Redirect or return forbidden if no admin profile exists.
- Consider checking role once role distinctions matter.

### 3. `account_history` is not append-only

File: `supabase/migrations/0001_core_schema.sql`

The comments say `account_history` is append-only, but the RLS policy grants
`for all` to admins. Admins can update or delete audit events.

Fix before continuing:

- Allow inserts and selects.
- Block updates and deletes with RLS and/or database triggers.
- Store manual pass reasons, email events, revocation reasons, and assignment
  access-control events only as immutable history events.

### 4. Hard deletes are exposed for core certification data

Files:

- `src/app/(dashboard)/admin/courses/actions.ts`
- `src/app/(dashboard)/admin/courses/[courseId]/topic-actions.ts`
- `src/app/(dashboard)/admin/questions/actions.ts`
- `src/app/(dashboard)/admin/questionnaires/actions.ts`

The admin UI exposes hard deletes for courses, topics, questions, and
questionnaires. This is dangerous once there are assignments, attempts,
certificates, or account history.

Specific risks:

- Deleting a course cascades topics, questions, and questionnaires.
- Deleting a question cascades answer options and questionnaire links.
- Deleting questionnaire questions can change the historical meaning of an
  assigned questionnaire unless assignment snapshots/versioning exist.
- Deleting participant-linked data conflicts with certification audit needs.

Fix before continuing:

- Replace deletes with archive/deactivate for normal admin UI.
- Permit hard delete only for unused draft records, with explicit checks.
- Add database restrictions where destructive deletes should never happen after
  assignment or attempt creation.

## High-Priority Issues

### 1. Questionnaire can be saved with zero questions

File: `src/app/(dashboard)/admin/questionnaires/schema.ts`

`question_ids` is `z.array(z.string().uuid())` with no `.min(1)`.

Fix:

- Require at least one selected question for an active questionnaire.
- Consider allowing zero only while questionnaire is inactive/draft.

### 2. Inactive questions can be selected for questionnaires

File: `src/app/(dashboard)/admin/questionnaires/questionnaire-form.tsx`

Inactive questions are shown with a badge but remain selectable.

Fix:

- Disable inactive questions for new selection.
- Decide whether already-selected inactive questions remain visible but locked
  for existing questionnaires.
- Server-side validation should reject inactive questions unless preserving an
  existing draft is explicitly intended.

### 3. Question topic/course consistency is not enforced

Files:

- `supabase/migrations/0001_core_schema.sql`
- `src/app/(dashboard)/admin/questions/actions.ts`

`questions.course_id` and `questions.topic_id` can point to different courses.
The UI filters topics by course, but the server accepts submitted IDs without
verifying that relationship.

Fix:

- Add server-side validation that `topic_id` belongs to `course_id`.
- Add a database-level constraint/trigger, or restructure to make invalid states
  impossible.

### 4. Questionnaire question/course consistency is not enforced in DB

File: `supabase/migrations/0001_core_schema.sql`

The server filters submitted question IDs by course, which is good, but the
database does not enforce that `questionnaire_questions.question_id` belongs to
the same course as `questionnaire_id`.

Fix:

- Add a database trigger or normalized constraint strategy.
- Keep server validation as a UX/security layer, but do not rely on it alone.

### 5. Assignment schema contradicts participant name rule

File: `supabase/migrations/0001_core_schema.sql`

`certification_assignments.allow_participant_name_entry` exists and defaults to
false. The locked MVP says the participant name is predefined by admin and the
participant cannot change it.

Fix:

- Remove this field unless there is a confirmed future requirement.
- Do not build candidate UI that permits participant name entry.

### 6. One-candidate-one-link invariant is not enforced

File: `supabase/migrations/0001_core_schema.sql`

The assignment table has unique `access_token`, but does not enforce whether a
participant can have only one assignment/link.

The product definition says:

- One candidate gets one personal questionnaire/certification link.
- The central object is the certification assignment.

Fix:

- Clarify whether this means one assignment per participant total, or one active
  assignment per participant/questionnaire.
- Add the appropriate unique index before building participant management.

### 7. Question edits replace all option rows

File: `src/app/(dashboard)/admin/questions/actions.ts`

The update action deletes all `question_options` for the question and reinserts
them. This is acceptable before attempts exist, but unsafe after assignments are
issued unless attempts fully snapshot everything and assigned questionnaires are
locked/versioned.

Fix:

- Before public attempts, decide if questions become locked once used.
- Alternatively create question versions/snapshots when assigning a
  questionnaire.

### 8. Certificate public data is not snapshotted

File: `supabase/migrations/0001_core_schema.sql`

`certificates` stores `certificate_number`, `verification_token`, file/url,
status, revoke fields, and timestamps. It does not store immutable public
certificate data such as:

- certificate display name
- course title at time of issue
- included topic titles at time of issue
- completion date
- rendered certificate data

Fix:

- Add certificate snapshot columns or a `certificate_public_snapshot` JSONB
  column.
- The public verification route should read from certificate snapshot data, not
  live course/topic/participant records that may change.

## Medium-Priority Improvements

### 1. Query errors are swallowed

Most server components use `data ?? []` and ignore `error`.

Fix:

- Display clear admin error states.
- Log errors server-side once logging exists.

### 2. Multi-step mutations need transactions

Examples:

- Create question, then create options.
- Update question, delete options, insert options.
- Create questionnaire, then insert question links.
- Replace questionnaire question links.

Fix:

- Use Supabase RPC/Postgres functions for transactional writes.
- At minimum, check every error and avoid partial success states.

### 3. Questionnaire question order has no explicit UI

The schema has `sort_order`, but the form stores order based on current question
list order. Admins cannot intentionally reorder selected questions.

Fix:

- Add explicit reorder controls before public attempt flow.
- Keep order stable and obvious.

### 4. `included_topic_ids uuid[]` should be normalized

File: `supabase/migrations/0001_core_schema.sql`

The assignment table stores `included_topic_ids` as a UUID array. This is harder
to validate, query, order, and snapshot.

Fix:

- Prefer `certification_assignment_topics` join table with `sort_order`.
- Snapshot topic titles onto certificates when issued.

### 5. Hand-maintained database types can drift

File: `src/types/database.ts`

The types mirror the migration manually.

Fix:

- Use generated Supabase types once the project is connected to Supabase.
- If manual types stay for now, add a process note to keep migration and types
  in sync.

### 6. README is still generic

File: `README.md`

The README is the default create-next-app text.

Fix:

- Replace with project-specific setup:
  - pnpm commands
  - env variables
  - Supabase migration steps
  - auth/admin setup
  - security notes
  - Slice status

## Low-Priority Polish

- `QuestionForm` and `QuestionnaireForm` are large client components; split once
  behavior grows.
- Admin UI is understandable, but delete buttons are too prominent for a
  certification system.
- Placeholder admin pages are acceptable, but should remain clearly incomplete.
- Terminal output showed mojibake for some non-ASCII punctuation in comments/UI
  text. Verify actual browser/editor rendering.
- Consider adding basic unit tests for schema validation and server action
  parsing.

## Security Findings

Good:

- Service-role client is in `src/lib/supabase/service.ts`.
- Service-role client imports `server-only`.
- No committed real Supabase keys were found.
- `.env.local.example` uses placeholders.
- `.gitignore` excludes real env files.
- Admin mutations call `requireAdmin()`.
- Login redirect target is restricted to `/admin`.

Risks:

- Auto-admin provisioning makes public signup catastrophic.
- `requireAdmin()` does not explicitly check admin membership.
- `admin_profiles` policies grant every admin full mutation rights.
- `account_history` is mutable.
- Manual pass and revocation reasons live on normal tables as well as future
  history; broad service-role selects could accidentally expose them.
- Future public routes must never select `participants.email`, attempts,
  answers, wrong answers, scores, or admin notes.
- Future personal access links need rate limiting and constant-shape responses
  to avoid token probing.
- Login flow has no application-level rate limiting.

Recommended security fixes:

1. Remove or harden auto-admin provisioning.
2. Make `requireAdmin()` check `admin_profiles`.
3. Restrict account history to insert/select only.
4. Move backend-only reasons into immutable history events, or guarantee they
   are never exposed by service-role public DTOs.
5. Create explicit DTO/query helpers for public participant and verification
   pages. Do not use `select("*")` in public service-role routes.
6. Add rate limiting before public token and attempt endpoints.

## Database and Schema Findings

Strong parts:

- Core tables are present.
- The central assignment object exists.
- Passing percentage and shuffle toggles are per questionnaire.
- Attempts and attempt answers have JSONB snapshot fields.
- Certificates have verification token and revocation status.
- RLS is enabled on all public tables.

Weak parts:

- Auto-admin trigger is unsafe unless signup is fully disabled.
- `account_history` is not append-only.
- Too many `on delete cascade` relationships for certification/audit data.
- Assignment uniqueness is unclear.
- `included_topic_ids` array is weak for validation and ordering.
- Certificate rows do not snapshot public certificate data.
- Topic/course consistency is not enforced.
- Questionnaire/question/course consistency is not enforced.
- There are no check constraints for score/count sanity.
- `account_history.event_type` is free text.

Suggested schema changes before Slice 2:

- Remove or replace `allow_participant_name_entry`.
- Add a unique assignment rule matching the product decision.
- Add `certification_assignment_topics` join table.
- Add immutable certificate snapshot fields.
- Add account history immutability.
- Replace destructive cascades with restrict/set-null where audit data must
  survive.
- Add constraints/triggers for course/topic/question consistency.
- Add constraints for attempts:
  - `attempt_number > 0`
  - `score_percentage between 0 and 100`
  - `correct_count >= 0`
  - `wrong_count >= 0`
  - one answer per attempt/displayed question where appropriate

## Product Logic Findings

Matches locked MVP:

- The code and schema mostly recognize certification assignments as central.
- Participant-facing flows are not prematurely overbuilt.
- Shuffle means question order and answer order only.
- No random question pool was implemented.
- Question bank is reusable.
- Topic-level recommendations are possible.
- Passing threshold is configurable per questionnaire.

Contradictions or risks:

- `allow_participant_name_entry` contradicts "participant cannot change name."
- Deleting/editing content can undermine "same questions are used for all
  attempts" unless assignment snapshots or locks are added.
- Candidate-specific assignment workflow is not yet represented in admin UI.
- The current public home page mentions certificate verification by certificate
  ID, while schema verification uses `verification_token`; align this later.
- Failed candidate visibility rules are not implemented yet, so future public
  DTOs must be tightly controlled.

## Attempt Snapshot Readiness

The schema can support the basics:

- question order snapshot
- answer order snapshot
- question text snapshot
- answer text snapshot
- correct answer snapshot
- selected answer snapshot
- recommendation snapshot
- topic snapshot via JSONB
- admin-only detailed answer records

Before implementing attempts:

- Define exact JSON shape for `attempt_snapshot`,
  `recommendation_snapshot`, `question_snapshot`,
  `selected_option_snapshots`, and `displayed_option_order`.
- Store enough data that later edits to questions/options/topics do not change
  historical attempts.
- Public latest-result query must return only:
  - latest percentage
  - pass/fail
  - topic-level recommendations on failure
  - certificate access on pass
- Public latest-result query must not return:
  - exact wrong questions
  - correct answers
  - full attempt history
  - admin notes
  - email

## Certificate Readiness

Current certificate table is not enough for a safe public verification page.

Need before certificate generation:

- immutable certificate number or ID
- verification token/URL
- generated file URL
- generated-at/completion date
- certificate display name snapshot
- course title snapshot
- included topic title/order snapshot
- certificate template/version snapshot or rendered SVG/PDF/PNG reference
- valid/revoked status
- revocation history event
- email-sent history event

Public verification must show:

- certificate document
- certificate data
- valid/revoked status

Public verification must not show:

- email
- score
- failed attempts
- wrong answers
- correct answers
- admin notes
- manual pass reason
- revocation reason

## Recommended Fixes Before Slice 2

Do these in order:

1. Replace unsafe admin provisioning.
   - Remove automatic "every auth user is admin" behavior, or lock it behind a
     confirmed disabled-signup deployment policy.
   - Update `requireAdmin()` to query `admin_profiles`.

2. Make audit history immutable.
   - Adjust RLS and/or triggers.
   - Decide event vocabulary.
   - Store manual pass, certificate email, revoke, deactivate/reactivate events
     only through append-only history.

3. Remove destructive deletes from admin workflow.
   - Replace with deactivate/archive.
   - Add guardrails for hard delete only when unused.

4. Tighten questionnaire rules.
   - Require at least one question for active questionnaires.
   - Reject inactive question selection for new questionnaires.
   - Add explicit question order controls or a clear ordering rule.

5. Add relational integrity checks.
   - Topic belongs to selected course.
   - Question belongs to questionnaire course.
   - Assignment uniqueness.
   - Attempt score/count constraints.

6. Decide locking/versioning model.
   - Once a questionnaire is assigned, can admins edit its questions?
   - If yes, assignment must snapshot/version the question set.
   - If no, lock assigned questionnaires/questions from structural edits.

7. Refactor certificate schema for immutable public snapshots.
   - Add certificate public snapshot fields before any generation code.

8. Replace default README.
   - Add actual setup, migration, and security instructions.

9. Add small tests.
   - Schema validation tests.
   - Server action parsing tests.
   - Database migration smoke checks if practical.

## Suggested Next Implementation Slice

Do not jump directly to public attempts.

After the foundation fixes above, build:

### Slice 2: Participants and Certification Assignments

Scope:

- Participant CRUD.
- Assignment creation as the central workflow.
- One personal access token per assignment.
- Assignment active/deactivated status.
- Included topic selection.
- Optional certificate display name.
- Account history entries for participant creation, assignment creation,
  deactivation/reactivation.
- Admin candidate detail page shell.
- Access link copy/regenerate controls, if regeneration is allowed.

This slice should prove that the app is assignment-centered before candidate
attempts and certificate generation are added.

## Files To Inspect Or Change

Primary schema/security files:

- `supabase/migrations/0001_core_schema.sql`
- `src/types/database.ts`
- `src/lib/auth/admin.ts`
- `src/lib/auth/actions.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/service.ts`
- `src/proxy.ts`

CRUD/action files:

- `src/app/(dashboard)/admin/courses/actions.ts`
- `src/app/(dashboard)/admin/courses/[courseId]/topic-actions.ts`
- `src/app/(dashboard)/admin/questions/actions.ts`
- `src/app/(dashboard)/admin/questions/schema.ts`
- `src/app/(dashboard)/admin/questions/question-form.tsx`
- `src/app/(dashboard)/admin/questionnaires/actions.ts`
- `src/app/(dashboard)/admin/questionnaires/schema.ts`
- `src/app/(dashboard)/admin/questionnaires/questionnaire-form.tsx`

Admin pages:

- `src/app/(dashboard)/admin/participants/page.tsx`
- `src/app/(dashboard)/admin/certificates/page.tsx`
- `src/app/(dashboard)/admin/settings/page.tsx`
- `src/app/(dashboard)/admin/page.tsx`

Project docs:

- `CLAUDE.md`
- `README.md`
- `.env.local.example`

## Questions For Developer Or Client

Only these questions should block architecture decisions:

1. Is Supabase public signup disabled in every environment, including preview
   and production?

2. Does "one candidate gets one personal questionnaire/certification link" mean:
   - one assignment per participant total, or
   - one assignment per participant per questionnaire/course?

3. Once an assignment is created, should the questionnaire and question set be
   locked, or should each assignment snapshot/version the questionnaire?

4. Are included certificate topics manually selected per assignment, or derived
   automatically from the questionnaire/course?

5. Should public verification serve a stored rendered certificate document,
   regenerated certificate data, or both?

6. Are manual-pass certificates visually or publicly distinguishable from normal
   pass certificates? The current product rules say the manual pass reason is
   backend-only, but they do not say whether the certificate itself differs.

## Final Build Guidance For Claude

Continue from the current foundation, but do not add public attempt routes,
certificate generation, or verification pages until the critical blockers are
fixed.

The safest next move is to harden auth/schema first, then implement participant
and assignment management as Slice 2.


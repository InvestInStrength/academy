# Codex Audit - Multilanguage Scope Review

Date: 2026-06-01  
Scope: second-opinion review of `docs/codex-brief-multilanguage.md` against the current Invest in Strength codebase.  
Result: no application code changes recommended here; this is an implementation handoff for Claude.

## Executive Verdict

**Recommendation: ship with changes, not as-is.**

The proposed architecture is directionally right for the locked scope: DE first, EN dormant, one global active language, append-only migrations, and no heavy i18n framework. Side-by-side localized columns and a typed `platform_settings` row are reasonable for a two-language certification platform.

The plan has one architectural blocker: **language freeze must be attempt-scoped and must actually happen at attempt start.** The current implementation does not create an attempt when the candidate starts an attempt; it inserts the attempt only on submit. Adding only `certification_assignments.language` would freeze the whole assignment, not the in-progress attempt, and can conflict with unlimited retries if the global language changes later.

There is also a sequencing risk with Slice 6 Certificate Output System. Certificate rendering, email delivery, template storage, and public verification are exactly where language snapshots matter, so Slice 6 and Slice 7 cannot be designed independently.

## 1. Per-Question Verdicts

### 1. [medium] Side-by-side columns vs translations table vs JSONB

**Verdict:** Use side-by-side columns for this locked DE/EN scope, but tighten the migration and fallback plan.

For two fixed languages, side-by-side columns are simpler than a translations table and safer than JSONB. They keep Supabase generated types usable, admin forms straightforward, database constraints inspectable, and queries predictable. A translations table is cleaner if the product expects many locales later; JSONB is the weakest fit here because validation, completeness checks, indexing, and TypeScript safety become softer.

**Required adjustment:** do not add localized columns as if every proposed field already exists. `course_topics` currently has `title` but no `description` or `recommendation_text` fields (`supabase/migrations/0001_core_schema.sql:79`). Topic-level learning recommendations currently come from question-level `recommendation_text` and are grouped by topic in scoring (`src/lib/certification/scoring.ts:109`). If topic-level recommendation copy belongs on topics, that is a product/schema addition, not only localization.

**Implementation rule:** backfill `*_de` from current fields, keep fallback as `COALESCE(field_active, field_de, old_field)` during the transition, and decide whether old fields are temporarily dual-written or truly retired after all readers move.

### 2. [low] `platform_settings` shape

**Verdict:** A typed single-row `platform_settings` table is the right choice.

Use explicit columns, not generic settings JSONB:

- `id boolean primary key default true check (id)`
- `active_language text not null default 'de'`
- `enabled_languages text[] not null default array['de']`
- timestamps

This keeps constraints and RLS simple. Future unrelated global settings can either become columns or separate typed tables. Do not start with a generic key/value system unless the product actually needs tenant-style arbitrary settings.

### 3. [high] Enforcing `active_language in enabled_languages`

**Verdict:** A database `CHECK` is sufficient for the core invariant; use a trigger only if you need array normalization.

Postgres can enforce:

```sql
check (active_language = any(enabled_languages)),
check (cardinality(enabled_languages) > 0),
check (enabled_languages <@ array['de', 'en']::text[])
```

Also restrict `active_language` to supported values with either a `CHECK` or enum. A trigger is only needed if you want to reject duplicate array values or normalize array order. Because the scope is only DE/EN, an alternative schema with booleans (`german_enabled`, `english_enabled`) is also defensible, but the proposed `text[]` is fine if constrained.

Do not rely on application code alone. The active/enabled invariant changes public candidate rendering, certificate language, and email language.

### 4. [blocker] In-progress attempt freeze edge cases

**Verdict:** The proposed `certification_assignments.language` design is not sufficient and is probably the wrong primary storage location.

Current code does not create an attempt at start. The attempt page loads and shuffles questions (`src/app/certification/[accessToken]/attempt/page.tsx:38`, `src/app/certification/[accessToken]/attempt/page.tsx:67`) and posts hidden order JSON (`src/app/certification/[accessToken]/attempt/page.tsx:79`). The attempt is inserted only inside `recordAttempt` on submit (`src/lib/certification/data.ts:230`), called from `submitAttempt` (`src/app/certification/[accessToken]/actions.ts:126`).

That means L4 cannot be enforced as written unless the lifecycle changes.

**Required change:** add `attempts.language` and create an attempt row at attempt start, before rendering the form. The candidate flow should then read from that attempt row until it is submitted or abandoned.

If the product intentionally wants one assignment to remain in one language across every retry, then `certification_assignments.language` can exist too, but that is a different rule than "in-progress attempts freeze language." With unlimited retries, attempt-scoped language is the safer invariant.

Edge cases to define before implementation:

- Candidate starts in DE, superadmin switches to EN, candidate submits: score and snapshots remain DE.
- Candidate abandons a DE in-progress attempt, starts a new attempt after EN switch: should the new attempt be EN or should the old draft resume?
- Candidate passes in DE, certificate/email/verification remain DE even if global active language later changes.
- Admin manual pass without an attempt: choose active language at manual-pass time or require admin to select language.

### 5. [high] Snapshot blob content: shown language vs both languages

**Verdict:** Store only the language the candidate actually saw, plus a `language` field. Do not store both languages in the attempt snapshot.

The audit trail should represent the actual attempt, not all possible translations. Storing both languages increases payload size and creates ambiguity when admins review exact mistakes.

Required snapshot fields:

- attempt-level `language`
- questionnaire title/description as shown
- question order as shown
- answer order as shown
- question text as shown
- answer text as shown
- correct answers as shown
- selected answers
- topic title as shown
- recommendation text as shown or generated from shown language
- score/pass result

Current `attempt_answers.question_snapshot` exists (`supabase/migrations/0001_core_schema.sql:228`) and `recordAttempt` writes question/option snapshots (`src/lib/certification/data.ts:281`), but there is no language field. Add language to both the structured attempt row and the JSON snapshots for defense-in-depth.

### 6. [medium] Read traffic/cache on `platform_settings`

**Verdict:** Start uncached or request-deduped. Do not introduce cross-request caching until there is evidence it is needed.

The settings row is tiny and global language changes should be reflected immediately. Candidate/public pages are already server-rendered/dynamic in the current design, and the cost of one settings read is lower than the risk of stale language after a superadmin switch.

Use a small server helper, e.g. `getActiveLanguage()`, and wrap with React `cache()` if multiple server components need it in the same request. If cross-request caching is added later, use the current Next 16 caching APIs carefully; this repo is on a Next version with breaking cache API changes, and tag invalidation signatures changed in Next 16.

Do not read `platform_settings` from browser code unless there is a strong reason. Public candidate flows should get the resolved language from server-rendered data.

### 7. [high] English string harvesting blind spots

**Verdict:** The proposed harvesting list is incomplete. There are several current surfaces that will leak English if not included.

Known hardcoded or locale-sensitive surfaces:

- root metadata and `<html lang="en">` (`src/app/layout.tsx:12`, `src/app/layout.tsx:23`)
- certificate SVG rendering date format (`src/lib/certificate/render.ts:33`)
- certificate email subject/body/date format (`src/lib/email/certificate-email.ts:17`, `src/lib/email/certificate-email.ts:69`)
- public verification date format and page copy (`src/app/verify/[verificationToken]/page.tsx:8`)
- shared admin date formatting (`src/lib/utils.ts:10`)
- candidate certificate page copy (`src/app/certification/[accessToken]/certificate/page.tsx:54`)
- scoring fallback topic label `"General"` (`src/lib/certification/scoring.ts:109`)
- admin history date formatting (`src/app/(dashboard)/admin/participants/[participantId]/history-section.tsx:10`)
- default submit pending text (`src/components/ui/submit-button.tsx:18`)
- auth pages, no-access pages, empty states, badge labels, table headers, button aria-labels, confirmation dialogs, and metadata

Also decide how to handle stored `account_history.event_label`. Event type codes should remain stable; user-facing labels should ideally be rendered from dictionary keys rather than stored as English text forever.

### 8. [medium] German translation QA process

**Verdict:** QA must happen before DE is treated as production-ready, not only in the final polish slice.

Because German is the first visible language, German copy quality is not a secondary concern. The project should have:

- a short glossary for certification terms
- dictionary key review by developer before client review
- client/native-speaker review before enabling the multilingual flag
- UI checks for long German strings in forms, tables, cards, buttons, certificates, and emails
- snapshot tests or rendered-output checks for certificate/email copy

Do not rely on raw machine translation for certificate and result feedback language. Those are client-facing legal/professional artifacts.

### 9. [blocker] Slice 6 Certificate Output System collision sequencing

**Verdict:** Do not build Slice 6 and Slice 7 independently. Either finish Slice 6 first with language hooks included, or land 7a/7b without touching certificate output and then make 7c part of Slice 6.

`docs/CERTIFICATE-OUTPUT.md` already plans certificate asset/template changes and server-side output work. The multilingual proposal also changes certificate templates, certificate snapshots, emails, and verification. If these are implemented separately, the project will likely need to rewrite the same certificate code twice.

Also resolve migration numbering before work starts. The roadmap expects Slice 6 to add `0002_certificate_assets.sql`; the multilingual brief may also want an early settings/content migration. Append-only migrations are locked, so the next migration number must be coordinated.

Minimum Slice 6 language hooks:

- certificate snapshot includes `language`
- certificate rendering accepts language/locale
- email rendering accepts language/locale
- certificate template selection is language-aware or has language-neutral layout plus localized text inputs
- public verification renders from snapshot language, not current global language

### 10. [high] What is missing or likely to break existing surfaces

**Verdict:** The plan misses several current implementation details.

Missing/breaking areas:

- `certification_assignments` has no language today (`supabase/migrations/0001_core_schema.sql:172`), but adding language only there does not enforce L4.
- `attempts` has no language and no draft/in-progress lifecycle (`supabase/migrations/0001_core_schema.sql:209`).
- `certificate_public_snapshot` exists only as JSON inside `certificates` and has no language contract (`supabase/migrations/0001_core_schema.sql:247`).
- questionnaire title/description updates are still allowed after assignment locking (`supabase/migrations/0001_core_schema.sql:427`), so language-specific questionnaire text must be considered carefully for in-progress attempts and certificates.
- question content is locked more strictly (`supabase/migrations/0001_core_schema.sql:469`), but new localized question fields must be added to those same lock guards.
- `loadQuestionnaireQuestions` reads live current-language content at request time (`src/lib/certification/data.ts:130`); attempt-start snapshots should avoid mid-attempt drift.
- `issueCertificate` currently renders from live participant/course/topic/template data at issue time (`src/lib/certificate/issue.ts:30`); it needs language-aware snapshot inputs.
- root layout and metadata are currently English (`src/app/layout.tsx:12`, `src/app/layout.tsx:23`).
- admin superadmin routing can reuse existing `requireSuperadmin`, but sidebar/settings links must be conditional like the admins settings page.

## 2. Independent Findings

### [blocker] Attempt start needs a real server-side concept

Current randomization happens during page render, then selected hidden JSON is submitted later. This is workable for MVP, but it is not enough for L4. A language freeze requires a persisted attempt-start boundary. Add a small start/resume attempt server action or route-level creation step before rendering the form.

### [high] Localized content fields must be added to lock triggers

The current schema has guard triggers for locked questionnaires, questions, and options. Any new `*_de` / `*_en` fields that affect candidate-visible attempts must be included in those guards. Otherwise admins could change localized text after assignments exist, breaking the snapshot/audit model.

### [high] Verification must render from certificate snapshot, not active language

The public verification page must not change language or content when `platform_settings.active_language` changes. It should render from the certificate snapshot language. Current verification already uses certificate snapshot data, but date formatting/page labels are English and not language-aware.

### [medium] Stored account history labels need a policy

`account_history` is append-only, which is good. But if event labels are stored as English display strings, the admin history will remain mixed-language forever. Prefer stable `event_type` codes plus localized display labels at render time. Keep backend-only details in `event_data`.

### [medium] Superadmin language switch needs readiness checks

Before allowing EN to become active, the UI should show missing EN content counts at minimum. Ideally, block activation if required public/candidate/certificate fields are missing. Without this, the fallback-to-DE rule can silently produce mixed-language candidate experiences.

### [medium] German-first means root metadata and document language matter

The root `<html lang="en">` and metadata contradict German-first. If active language is global, root layout should use the active language where feasible. Static metadata may need to become generated metadata, or at least German defaults until EN is enabled.

### [low] No heavy dependency is the right i18n choice

Do not add a full i18n routing framework. This product does not need per-user locale routing, locale prefixes, browser language negotiation, or translated static marketing pages for this slice. A typed dictionary/helper layer is enough.

## 3. Bottom-Line Recommendation

**Ship with changes X/Y/Z. Do not rethink the whole plan, but do not implement it exactly as proposed.**

Required changes before Slice 7 implementation:

1. **Move language freeze to the attempt lifecycle.** Add `attempts.language`; create/resume an attempt row at start; snapshot shown-language content from that attempt.
2. **Coordinate with Slice 6.** Decide migration numbering and make certificate output language-aware before or during certificate rendering/email work.
3. **Add database constraints.** Constrain `platform_settings`, supported languages, active/enabled invariant, and localized lock guards.
4. **Use side-by-side columns with explicit fallback/backfill.** Avoid JSONB; avoid translations tables unless more locales become a real requirement.
5. **Harvest all user-visible strings, dates, metadata, and stored labels.** The initial proposed list misses important certificate, verification, layout, admin, and history surfaces.
6. **Add readiness checks before enabling EN.** Fallback to DE is good for resilience, but the superadmin should see what remains untranslated.

Suggested implementation order:

1. `0002_platform_settings_and_attempt_language.sql`
   - Add `platform_settings`.
   - Add `attempts.language`.
   - Add constraints.
   - Add helper seed row.

2. Attempt-start lifecycle
   - Create/resume attempt before rendering candidate attempt page.
   - Store language and order snapshots at start.
   - Submit against the persisted attempt.

3. i18n runtime and German dictionary
   - Add server `getActiveLanguage`, `getServerT`, and dictionary files.
   - Convert candidate/public/certificate-facing strings first.
   - Convert admin strings second.

4. Content column migration
   - Add `*_de` / `*_en` columns to current localized content tables.
   - Backfill DE from current fields.
   - Update readers/writers.
   - Update lock triggers.

5. Certificate/email/verification language integration
   - Prefer doing this alongside Slice 6 Certificate Output System.
   - Certificate snapshot stores language.
   - Public verification renders snapshot language.

6. Tests and QA
   - Settings constraints.
   - Attempt language freeze.
   - Snapshot immutability.
   - Fallback behavior.
   - Certificate/email language rendering.
   - No public leakage of admin-only data.

## 4. Files Most Likely To Change

- `supabase/migrations/0002_*.sql`
- `src/lib/i18n/*`
- `src/lib/certification/data.ts`
- `src/lib/certification/scoring.ts`
- `src/app/certification/[accessToken]/attempt/page.tsx`
- `src/app/certification/[accessToken]/actions.ts`
- `src/lib/certificate/issue.ts`
- `src/lib/certificate/render.ts`
- `src/lib/certificate/templates.ts`
- `src/lib/email/certificate-email.ts`
- `src/app/verify/[verificationToken]/page.tsx`
- `src/app/layout.tsx`
- `src/components/ui/submit-button.tsx`
- admin form components for courses, topics, questions, questionnaires, participants, and settings

## 5. Questions That Still Affect Implementation

1. Should a new retry after the global language changes use the new active language, or should an assignment keep the language of its first attempt forever?
2. If an attempt is started but abandoned, should the next visit resume the same in-progress attempt or create a new attempt in the then-current active language?
3. For admin manual pass without a candidate attempt, should certificate language be current active language, admin-selected language, or assignment language?
4. Should topic-level recommendations become real topic fields, or should recommendations remain question-level and merely be grouped by topic?
5. Should EN activation be blocked when required EN content is missing, or only warn and rely on DE fallback?

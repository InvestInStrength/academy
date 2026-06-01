# Brief for Codex — Multilanguage scope review

**Date:** 2026-06-01
**Author:** Claude (working on this repo with the client owner)
**Your role:** Independent second opinion on the proposed multilanguage architecture and slice plan. Read this brief plus the linked files, then return a short audit: where the plan is right, where it is wrong or fragile, and what is missing. Do not redesign the product; do challenge implementation choices.

---

## 1. Context (what you need to know)

**Invest in Strength** is a Next.js 16 (App Router, React 19, TypeScript strict) certification management platform on Supabase (Postgres + Auth + Storage, RLS on every table). Live at `investinstrength.academy`. Hand-rolled UI (no component library), Tailwind v4, Zod, `@supabase/ssr` for cookie sessions, Resend for transactional email, `qrcode` for cert QRs.

**Central object:** the certification *assignment* (one participant + one questionnaire + one access token). Not a generic quiz app.

**MVP status:** Slices 1–5 complete and live (admin CRUD, candidate attempt flow, scoring, certificate generation + verification, Resend delivery). Live database is one migration in (`0001_core_schema.sql`). **Production has no real content yet** — a German "Zertifizierungstest" draft was seeded and immediately cleaned (the client is still finalising the questions + answer key). This means migrations to come can be additive without painful backfill.

**Hardening already applied** (don't re-flag):
- `requireAdmin` / `requireSuperadmin` verify an active `admin_profiles` row; superadmin gates admin-management.
- `account_history` is append-only (policies + trigger).
- Archive-first guarded deletes; hard delete only for unused records.
- DB triggers enforce topic↔course, question↔questionnaire-course, and **content-locking**: a questionnaire/question used by an assignment is frozen.
- Assignment uniqueness index; `certification_assignment_topics` join table.
- Frozen snapshots: `question_snapshot` (JSONB on each attempt-question row) and `certificate_public_snapshot` (the rendered SVG, captured at issue). These are **immutable** by design.

**Migration policy:** strictly append-only. 0001 is live, so anything new is 0002+.

---

## 2. Locked decisions (do not re-litigate)

The product owner has locked these. Critique the *implementation* of them, not the decisions themselves.

| # | Decision |
|---|----------|
| L1 | Multilanguage is a **superadmin-only feature flag**. The capability is invisible to every other surface (no candidate switcher, no per-admin preference, no language label anywhere until the superadmin enables a second language). |
| L2 | **German first.** Client wants the platform to ship in German. English is a second slot, dormant until the superadmin explicitly enables it. |
| L3 | **Single global active language.** No per-assignment, per-admin, or per-candidate preference. One switch flips everyone. |
| L4 | **In-progress attempts freeze their language** at attempt-start. A mid-flight toggle flip does not swap the language out from under a candidate. |
| L5 | **Append-only migrations.** |
| L6 | **No new heavy dependencies.** We pick the lightest path possible (no `next-intl` unless it's the only sane option). |

---

## 3. Proposed architecture

### 3.1 Platform settings

New table `public.platform_settings`, **single-row** (enforced via primary-key `id = 1`-style pattern or a unique constraint on a constant column). Columns:

```sql
create table public.platform_settings (
  id                 smallint primary key default 1 check (id = 1),
  active_language    text     not null default 'de',
  enabled_languages  text[]   not null default array['de'],
  updated_at         timestamptz not null default now()
);
-- Invariant: active_language must be one of enabled_languages.
-- See open question §5 — CHECK constraint with array containment, or trigger?
```

RLS:
- `select` — every authenticated admin + the public/service-role candidate flow can read (the active language drives every render).
- `insert` / `update` — superadmin only.

The candidate flow already reads via the service-role DTO layer, so it bypasses RLS — fine.

### 3.2 i18n runtime

- `src/lib/i18n/messages.de.json` + `messages.en.json`.
- `src/lib/i18n/index.ts` — exports `getActiveLanguage()` (server-side, reads `platform_settings` once per request and caches), a `t(key, params?)` helper, and a `<LocaleProvider>` client component for components that need locale context.
- Server components: `const t = await getServerT();` then `t("admin.sidebar.dashboard")`.
- Validation: Zod messages move into dict keys; Zod schemas accept an injected `t` for refinements.

### 3.3 Content schema (side-by-side columns)

Migration 0003 adds `_de` and `_en` columns to every translatable field:

| Table | New columns |
|-------|-------------|
| `courses` | `title_de`, `title_en`, `description_de`, `description_en` |
| `course_topics` | `title_de`, `title_en`, `description_de`, `description_en`, `recommendation_text_de`, `recommendation_text_en` |
| `questions` | `question_text_de`, `question_text_en`, `recommendation_text_de`, `recommendation_text_en` |
| `question_options` | `option_text_de`, `option_text_en` |
| `questionnaires` | `title_de`, `title_en`, `description_de`, `description_en` |
| `certificate_templates` | `name_de`, `name_en`, `svg_template_de`, `svg_template_en` |

Old single-language columns are kept (no-op) until a later cleanup migration drops them.

**Render layer:** every server component reads `field_{active_language}` with fallback to `field_de` (German is the source-of-truth language).

**Admin forms:** read `enabled_languages` from `platform_settings` and render N inputs per translatable field. With only DE enabled → one input, no language label, UI looks identical to today. When EN is enabled later → two side-by-side inputs.

### 3.4 Snapshots

- `question_snapshot` (JSONB) currently stores `{question_text, options: [{text, is_correct}]}`. With multilanguage, the snapshot stores **only the language the candidate saw**, plus `language: 'de' | 'en'`. The immutable record is what they saw, not what could have been shown.
- `certification_assignments` gains a `language` column, set at attempt-start (`status` transition `not_started → in_progress`). The candidate flow reads attempt language, **not** `platform_settings.active_language`, while the attempt is alive.
- Certificate emails + the issued certificate SVG use the attempt's frozen language.

### 3.5 Emails + certificate

- `src/lib/email/certificate-email.ts` splits into `certificate-email.de.ts` / `.en.ts` (or one file with a per-language map). Subject + body localized.
- `src/lib/certificate/templates.ts` exports `DEFAULT_CERTIFICATE_TEMPLATE_DE` + `DEFAULT_CERTIFICATE_TEMPLATE_EN`. Renderer picks based on attempt language.
- All cert string literals ("Certificate of Completion", "DATE OF COMPLETION", "Certificate ID:", "Topics covered:", date format `'15 Juni 2026'` vs `'15 June 2026'`) localized.

### 3.6 Superadmin surface

- Route: `/admin/settings/language` (or `/admin/settings/multilanguage`). Guarded by `requireSuperadmin()`.
- Sidebar entry visible only when `is_superadmin === true`.
- UI:
  - Active language: **Deutsch**
  - Enabled languages: **Deutsch**
  - Button: **Add English** → enables EN. From that point, admin content forms grow a second input per field.
  - Switcher (disabled until 2+ enabled): set active language.

---

## 4. Proposed slice plan

- **7a — German-first foundation** *(largest chunk; the visible work)*
  - Migration 0002: `platform_settings` table seeded with `active='de', enabled=['de']`.
  - `src/lib/i18n/` infra + `LocaleProvider` + `t()` helper.
  - Every hardcoded English string in admin chrome + candidate chrome + Zod validation moved to dict keys. EN dict = current English copy; DE dict freshly translated.
  - Superadmin route + sidebar gate.
  - **End state:** platform serves German to everyone except the superadmin, who sees the language settings page. No second-language UI surfaces anywhere.

- **7b — Content schema bilingual (dormant)**
  - Migration 0003 (additive). Dual-input admin forms conditional on `enabled_languages`. Render uses `field_{active_language}`. `question_snapshot` + `assignments.language` updates.

- **7c — Emails + certificate per-language**
  - Email + cert template duplication. Renderer + email sender pick from attempt-frozen language.

- **7d — Tests + polish**
  - Vitest coverage for dict loading, `t()` fallback, settings RLS, attempt language freeze, render-language selection.
  - Visual QA: no English visible to non-superadmin.

---

## 5. Questions I need your read on

1. **Side-by-side `_de`/`_en` columns vs a translations table vs JSONB.** I picked side-by-side for two known locales. Does this regret me at locale #3? At bulk-export "give me all DE strings"? Is the column-doubling cost in `questions` / `question_options` worth the query simplicity, or is JSONB (`title jsonb` storing `{de: "...", en: "..."}`) actually cleaner here? Trade-off recommendation, please.

2. **`platform_settings` shape.** Single-row table with `active_language` + `enabled_languages text[]`. Alternative: generic `settings(key text primary key, value jsonb)`. Which is cleaner given current settings needs (just language) and the realistic likelihood of more global toggles arriving (cert-template default, pass threshold default, etc.)?

3. **Enforcing `active_language ∈ enabled_languages`.** A `CHECK (active_language = any(enabled_languages))` works in Postgres. Cleaner than a trigger? Or am I missing a foot-gun (e.g., DEFERRABLE, partial-update ordering)?

4. **In-progress attempt freeze.** The invariant: once an attempt enters `in_progress`, its language is frozen on the row and the candidate flow reads attempt.language, **not** `platform_settings.active_language`. Edge cases I've thought about:
   - Cert issued after attempt completes, regardless of any toggle flip in between → uses attempt.language. ✅
   - Completion email → uses attempt.language. ✅
   - Candidate resumes a not-yet-started assignment after a flip → sees the new active language because `attempt_start` hasn't happened. Reasonable?
   - Mid-attempt page reload → server-component render reads attempt.language. Confirm this is the right read path and not a `platform_settings` fallback that could leak.

   What am I missing?

5. **Snapshot blob content.** `question_snapshot` plan: store only the language the candidate saw, plus a `language` discriminator. Don't store both. Rationale: the immutable record is what the candidate actually saw. Counter-argument worth weighing: storing both lets us re-render a completed attempt in the *other* language for review purposes. I don't think we need that. Confirm or push back.

6. **Read traffic on `platform_settings`.** Every server-rendered page needs the active language. A `select` per request on a single-row table is cheap, but is it worth a server-side cache (per-request, in-process) keyed off a `revalidateTag('platform-settings')` invoked on update? Or am I over-engineering — is the bare per-request select fine until proven otherwise?

7. **Harvesting English strings.** Plan: grep the codebase for hardcoded user-visible strings and move them to the dict. Things I'd expect to miss without an explicit checklist:
   - Server-action error responses returned via `FormState`.
   - Toast messages (we have none yet — confirm).
   - Email subjects + body.
   - 404 / error-page copy.
   - Cert SVG copy (covered in 7c).
   - `<title>` and `<meta description>` tags.
   - Resend "From" name (`"Invest in Strength <noreply@…>"` — should this be localized? Probably not; the brand name is the brand name in any language).
   - Anything else?

8. **DE translation provenance.** I will author the German dict. The client is a German native but not a translator. Recommended QA process: machine-pass + client review during 7d, or earlier? Process question, not code.

9. **Slice 6 (Certificate Output System) collision.** Slice 6 is parked pending the designer's final SVG. It expands the cert renderer (PDF + PNG + Instagram story) and adds a `certificate_assets` table + typed templates. Slice 7c's per-language cert template work touches the same files. Two options:
   - (a) Sequence 7c after Slice 6 lands; weave language into 6's design upfront so we don't rewrite.
   - (b) Land 7c against the current renderer; redo it inside Slice 6.

   I lean (a). Confirm or push back.

10. **What am I missing?** Specifically — what existing surface, schema constraint, or invariant does this plan silently break? Examples I want you to scrutinize:
    - `course_topics.recommendation_text` is shown to failed candidates; localized correctly.
    - Admin lists (`/admin/courses`, etc.) — they show `title` today. Do they need a "translation completeness" badge (e.g., "EN missing") so admins know which records are not yet bilingual when EN is enabled? Not in my plan; should it be?
    - Login screen labels, password-reset emails (if any), session-expired redirects.
    - `account_history` event labels — currently English (`"assignment_created"`, etc.). These are internal codes, not user-visible — confirm we should leave them alone.
    - The `proxy.ts` redirect logic — anything language-aware (e.g., `Accept-Language` parsing)? Plan: no, global toggle is authoritative.

---

## 6. Hard rules

- **No scope expansion.** Don't propose candidate-facing language switchers, per-admin preferences, RTL prep, or new locales unless they materially fix a bug in the plan.
- **Append-only migrations.** 0002 (settings) and 0003 (content columns) are additive. The old single-language columns stay no-op until a later cleanup migration.
- **No new heavy deps.** Lightweight i18n only.
- **Service-role key never reaches the browser.**
- **Frozen snapshots remain immutable.** Multilanguage must not invalidate `certificate_public_snapshot` or `question_snapshot` semantics.

---

## 7. Files to read

| Path | Why |
|------|-----|
| `docs/ROADMAP.md` | Current state and locked decisions log. |
| `CLAUDE.md` and `AGENTS.md` | Project conventions. |
| `supabase/migrations/0001_core_schema.sql` | Schema as deployed (the source of truth). |
| `src/lib/auth/admin.ts` | `requireAdmin()` / `requireSuperadmin()`. |
| `src/lib/certificate/render.ts` and `templates.ts` | Cert renderer + default template; 7c touches these. |
| `src/lib/email/certificate-email.ts` | Email template; 7c touches this. |
| `src/lib/certification/data.ts` and `scoring.ts` | Candidate-flow DTOs + scoring. |
| `src/app/(dashboard)/admin/**` | Admin chrome and forms (where dual-input lands). |
| `src/app/certification/[accessToken]/**` | Candidate flow (where attempt-frozen language renders). |
| `src/lib/__tests__/`, `src/lib/certificate/render.test.ts`, `src/lib/certification/scoring.test.ts` | Existing test patterns to extend. |
| `docs/CERTIFICATE-OUTPUT.md` | Slice 6 spec (relevant for question §9). |

---

## 8. What I want back

A short audit document (markdown is fine) with:

1. **Per-question verdict** for §5 items 1–10. For each: a direct answer + rationale + (if applicable) a specific file or line where my plan needs adjustment.
2. **Independent findings** — anything outside the listed questions that I should know.
3. **A bottom-line recommendation** — "ship this plan as-is", "ship with changes X, Y, Z", or "rethink".

Severity tags help: `[blocker]` / `[high]` / `[medium]` / `[low]` / `[nit]`.

Thanks.

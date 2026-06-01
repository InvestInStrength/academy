# Multilanguage — Current state of the art

**Last updated:** 2026-06-01 (Slice 7 fully shipped)
**Read before:** touching any i18n surface, adding new admin/candidate pages, adding new translatable content fields, or starting Slice 6 (Certificate Output System — which has open cert/email language coupling).

This document is the authoritative snapshot of the bilingual implementation as it stands. The slice-by-slice history is in `docs/ROADMAP.md`; the design + audit context is in `docs/slice-7a-plan.md`, `docs/codex-brief-multilanguage.md`, and `docs/codex-audit-multilanguage.md`. This file is the **operational reference**.

---

## 1. Locked product decisions

These come from the product owner and the Codex audit. Don't re-litigate without explicit authorization.

| # | Decision |
|---|----------|
| L1 | Multilanguage is a **superadmin-only feature flag**. Invisible to every other surface unless a second language is enabled. |
| L2 | **German is the default and source-of-truth language.** English is a dormant slot, enabled later by the superadmin. |
| L3 | **One global active language.** No per-admin preference, no per-candidate switcher. The superadmin toggles for everyone. |
| L4 | **In-progress attempts freeze their language** at attempt-start. A mid-flight toggle flip cannot swap the language out from under a candidate. |
| L5 | **Append-only migrations.** Never edit a live migration in place. |
| L6 | **No heavy i18n dependency** (no `next-intl`, no `i18next`). We use a hand-rolled dict + server/client primitives. |

Supported locales today: `{de, en}`. Adding a third locale is a structural change — see §10.

---

## 2. Where the active language comes from

Source of truth: **`public.platform_settings`** (single-row table, primary key `id boolean = true`).

| Column | Type | Notes |
|---|---|---|
| `active_language` | `text` | Always `'de'` or `'en'`. CHECK constraint to that set. |
| `enabled_languages` | `text[]` | Non-empty subset of `{'de','en'}`. CHECK constraint. `active_language` must be in this set. |
| `updated_at` | `timestamptz` | Touched by trigger on update. |

RLS: anyone can `select`; only superadmin can `update`. Migration `0002_platform_settings_and_attempt_language.sql` created and seeded the row with `active='de', enabled=['de']`.

**To read the active language server-side:** `await getActiveLanguage()` from `src/lib/i18n/index.ts`. It's wrapped in React `cache()` so multiple calls in one render share one DB read; cache is per-request, so a superadmin flip is reflected on the next render.

**To check whether English is enabled:** `await isEnglishEnabled()` (same module).

---

## 3. Attempt-scoped language freeze

`public.attempts.language` column (`text NOT NULL DEFAULT 'de'`, CHECK to supported set).

The candidate flow does NOT read `platform_settings.active_language` for any in-flight attempt. Instead:

1. **Attempt-start:** `src/lib/certification/attempt-lifecycle.ts → startOrResumeAttempt(assignmentId)` either finds an in-progress row (`submitted_at IS NULL`) and returns it, or inserts one with `language = currentActiveLanguage` from platform settings.
2. **Mid-attempt resume:** the same row is returned regardless of any subsequent flip — its frozen language wins.
3. **Submit:** `recordAttempt` UPDATEs the in-progress row (does not insert). The attempt's `language` is also stored in `attempt_snapshot` and per-answer `question_snapshot` JSON as defense-in-depth.
4. **Next retake (after submit):** a new row is inserted with the now-current active language.

The pure orchestration is in `attempt-lifecycle-core.ts` so it can be unit-tested without env vars (see `src/lib/certification/__tests__/attempt-lifecycle.test.ts`).

Snapshots are immutable. The `account_history` table is append-only at the DB level.

---

## 4. Content schema — bilingual columns

Migration `0003_localized_content_columns.sql` added `_de` and `_en` text columns to every translatable content field. **Old single-language columns are kept** (no-op), populated by dual-write, and would be dropped only by a future cleanup migration once no reader depends on them.

| Table | Localized fields |
|---|---|
| `courses` | `title`, `description` |
| `course_topics` | `title` |
| `questions` | `question_text`, `explanation`, `recommendation_text` |
| `question_options` | `option_text` |
| `questionnaires` | `title`, `description` |
| `certificate_templates` | **deferred — owned by Slice 6** (see §11) |

The migration backfilled `_de` from the legacy column for every existing row. Lock trigger `guard_questions_update` was extended to include all new localized question columns; `guard_question_options` already blocks any change on a locked question's options so its new localized columns are covered transitively. `guard_questionnaires_update` does *not* lock title/description (existing policy — they can change post-lock).

### Read path

Use `pickLocalized(row, fieldBase, locale)` from `src/lib/i18n/content.ts`. Fallback rule (current phase):

- For `locale = 'de'` → returns the **legacy column** directly. (Avoids staleness against partial-dual-write states. Once dual-write is fully battle-tested, the helper can be flipped to prefer `_de` for DE.)
- For `locale ≠ 'de'` → tries `_{locale}` → `_de` → legacy. (Standard "missing translation → DE fallback" chain.)
- Empty strings are treated as missing.

8 unit tests cover the helper (`src/lib/i18n/__tests__/content.test.ts`).

### Write path — dual-write

Every admin content action writes both the legacy column AND `_de` from the same input:

```ts
.insert({ title: d.title, title_de: d.title, title_en: nullOrText(d.title_en), … })
```

The single DE input populates both columns identically. When EN is enabled and the admin fills the EN input, `*_en` is set. All actions follow this pattern; grep `title_de:` to audit. See `src/app/(dashboard)/admin/courses/actions.ts` for the canonical example.

### Snapshot fields

`attempt_snapshot.questionnaire_title` and each `attempt_answers.question_snapshot.{question_text, options[].option_text, topic_title}` capture the **locale-resolved** text the candidate actually saw, plus `language` discriminator. See `recordAttempt` in `src/lib/certification/data.ts`.

---

## 5. UI chrome — dict-driven

### Dicts

- `src/lib/i18n/messages.de.json` — full German translation. Authored by Claude; **needs native-speaker review** before going live to candidates (see §9).
- `src/lib/i18n/messages.en.json` — same key set, English. Used as the dormant slot.

Same keys must exist in both files. The dict-load test in `src/lib/i18n/__tests__/i18n.test.ts` asserts key parity.

### Key namespaces

| Prefix | Owner |
|---|---|
| `meta.*` | App title, brand, brand subtitle. |
| `common.*` | Shared verbs/nouns (save, cancel, active, deactivate, passed, valid, sign out, etc.). |
| `validation.*` | Reserved for future Zod centralisation. Some keys exist; not yet wired (see §8). |
| `nav.*` | Sidebar entries. |
| `attempt.*` | Candidate attempt page chrome (frozen per attempt). |
| `candidate.*` | Hub, email gate, result, link-unavailable. |
| `verify.*` | Public verification index + token detail. |
| `auth.*` | Login + no-access pages. |
| `admin.dashboard.*` | Admin dashboard. |
| `admin.courses.*` | Courses list, detail, error messages. |
| `admin.topics.*` | Course-topic chrome and confirm prompts. |
| `admin.questions.*` | Question bank chrome + error messages. |
| `admin.questionnaires.*` | Questionnaire chrome + lock notice. |
| `admin.participants.*` | Participant list + detail. |
| `admin.assignments.*` | Assignments section inside participant detail. Includes status labels. |
| `admin.history.*` | Account history section. |
| `admin.certificates.*` | Admin certificate list. |
| `admin.admins.*` | Superadmin admin-management page + form. |
| `admin.settings.*` | Settings hub. |
| `admin.settings.language.*` | Superadmin Language settings page. |
| `admin.forms.field.*` | All form field labels, hints, placeholders. Includes the `_de`/`_en` variants for dual-input forms. |
| `scoring.*` | Currently just `general_topic` (fallback when a question has no topic). |

### Server components

```ts
import { getServerT } from "@/lib/i18n";
const { locale, t } = await getServerT();
// then: t("admin.courses.title") or t("admin.courses.list_title", { count })
```

`getServerT` returns the active locale and a bound `t()`. Use it from any server component or server action.

### Server components that already have `locale` from upstream

Pass `locale` through and use `getDictionary(locale)` + the pure `t` from `src/lib/i18n/dict`:

```ts
import { getDictionary, t as rawT } from "@/lib/i18n/dict";
const dict = getDictionary(locale);
const t = (k, p?) => rawT(dict, k, p);
```

Examples: `topics-section.tsx`, `assignments-section.tsx`, `history-section.tsx`.

### Client components

Wrap in a `LocaleProvider` (already done at every layout boundary — admin, candidate certification, verify, login) and call `useT()`:

```tsx
"use client";
import { useT } from "@/lib/i18n/client";
export function MyForm() {
  const t = useT();
  return <button>{t("common.save")}</button>;
}
```

The provider reads the active locale once per request and supplies it via React context. The dict module is bundled into the client (both DE and EN — JSON is small).

### Param substitution

`t("admin.courses.list_title", { count: 5 })` substitutes `{count}` in the template. Unknown placeholders are left as `{name}` literals. Empty params object → no substitution.

### `<html lang>` and metadata

`src/app/layout.tsx` is async, reads `getActiveLanguage()`, and:
- sets `<html lang={locale}>`
- builds `Metadata.title / description` from the active dict via `generateMetadata()`

Verify and login pages have their own `generateMetadata` for their dedicated titles.

---

## 6. Locale-aware dates

`src/lib/utils.ts` exports:

- `formatDate(iso, locale?)` — short (e.g. `27 May 2026` / `27. Mai 2026`). Defaults to `'en'` for back-compat.
- `formatLongDate(iso, locale?)` — long form (`15 June 2026` / `15. Juni 2026`).

BCP-47 mapping: `de → de-DE`, `en → en-GB`.

Every user-facing date call has been migrated; legacy `formatDate(iso)` calls without locale render as en-GB (intentional fallback).

The history-section also has its own locale-aware `formatDateTime` for short timestamps.

---

## 7. File coverage matrix

| Path | Locale-driven |
|---|---|
| `src/app/layout.tsx` | ✅ `<html lang>` + metadata via `generateMetadata` |
| `src/app/(dashboard)/admin/layout.tsx` | ✅ wrapped in `LocaleProvider`; brand strings via dict |
| `src/app/certification/layout.tsx` | ✅ LocaleProvider |
| `src/app/verify/layout.tsx` | ✅ LocaleProvider |
| `src/app/(auth)/admin/login/page.tsx` | ✅ + LocaleProvider so the LoginForm sees it |
| `src/app/(auth)/admin/no-access/page.tsx` | ✅ |
| `src/components/admin/sidebar.tsx` | ✅ client, `useT()` |
| `src/components/ui/submit-button.tsx` | ✅ default pending text falls back to `t("common.saving")` |
| `src/app/(dashboard)/admin/page.tsx` (dashboard) | ✅ |
| `src/app/(dashboard)/admin/courses/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/courses/[courseId]/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/courses/[courseId]/topics-section.tsx` | ✅ |
| `src/app/(dashboard)/admin/courses/course-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/courses/[courseId]/topic-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/questions/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questions/new/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questions/[questionId]/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questions/question-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/questionnaires/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questionnaires/new/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questionnaires/[questionnaireId]/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/questionnaires/questionnaire-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/participants/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/participants/[participantId]/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/participants/participant-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/participants/[participantId]/assignments-section.tsx` | ✅ |
| `src/app/(dashboard)/admin/participants/[participantId]/history-section.tsx` | ✅ + locale-aware date-time |
| `src/app/(dashboard)/admin/certificates/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/settings/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/settings/admins/page.tsx` | ✅ |
| `src/app/(dashboard)/admin/settings/admins/admin-create-form.tsx` | ✅ client, `useT()` |
| `src/app/(dashboard)/admin/settings/language/page.tsx` | ✅ |
| `src/app/certification/[accessToken]/page.tsx` (hub) | ✅ |
| `src/app/certification/[accessToken]/email-form.tsx` | ✅ client, `useT()` |
| `src/app/certification/[accessToken]/attempt/page.tsx` | ✅ chrome via attempt-frozen language |
| `src/app/certification/[accessToken]/result/page.tsx` | ✅ |
| `src/app/verify/page.tsx` | ✅ |
| `src/app/verify/[verificationToken]/page.tsx` | ✅ + locale-aware completion date |

---

## 8. Known gaps (intentionally English right now)

These don't break the German launch — candidates only encounter Zod errors when they enter bad data, and `FormState.message` returns only fire on save failures (which admins, not candidates, see in regular flow). When you decide to close them, the work is small and bounded.

### Gap 1 — Zod schema inline error messages

Schemas in `src/app/(dashboard)/admin/**/schema.ts` and similar embed messages inline:

```ts
z.string().trim().min(1, { message: "Title is required." })
```

These surface through `state.fieldErrors?.title` in forms. To localise, two options:

- **Option A — message-key approach.** Change schema messages to dict keys (`{ message: "validation.title_required" }`). Add a small helper that translates keys at form render time, e.g. `error={state.fieldErrors?.title ? t(state.fieldErrors.title) : undefined}`. Touches: every schema + every form. The keys already exist under `validation.*` (mostly empty, ready to fill).

- **Option B — translate in `fieldErrorsFromZod`.** Receive a `t` function in the helper, translate keys before returning. Caller in the action now needs access to `t` — wire `getServerT()` at the top of each action. Touches: `fieldErrorsFromZod` + every action.

Both work. Option A is the lighter touch.

### Gap 2 — Server-action `FormState.message` returns

Strings like `"Please correct the highlighted fields."`, `"Could not save changes. Please try again."`, `"Cannot delete: this course has questions or questionnaires. Deactivate it instead."` are returned from server actions as `{ message: "…" }`. The dict already has counterpart keys (e.g. `admin.courses.could_not_save`, `validation.field_errors`) — they just need to be wired:

```ts
const { t } = await getServerT();
return { message: t("admin.courses.could_not_save") };
```

Mechanical pass across each `actions.ts`. ~30 strings total across the admin tree.

### Gap 3 — `account_history.event_label` stored as English

The DB stores history events with English `event_label` (`"Email submitted"`, `"Attempt {n} submitted"`, `"Certificate emailed"`, …). The history-section renders these as-is. This is fine because (a) history is admin-only, (b) the labels are factual and short, (c) rewriting historical labels would mutate audit data which violates the append-only contract.

To localise display without touching stored data: render from the `event_type` discriminator (`assignment_created`, `attempt_submitted`, …) via a dict map (`history.event.assignment_created` etc.), with the stored `event_label` as fallback. Codex audit §1.7 / Independent findings flagged this as a `[medium]` policy choice. Not done.

### Gap 4 — Certificate SVG copy + email subject/body

Owned by Slice 6 (Certificate Output System). Currently the cert renderer (`src/lib/certificate/render.ts`, `src/lib/certificate/templates.ts`) and email template (`src/lib/email/certificate-email.ts`) emit English-only chrome (`"Certificate of Completion"`, `"DATE OF COMPLETION"`, `"Topics covered:"`, email subject/body). Migration `0003+` for Slice 6 lands the cert assets table + typed templates; the language-aware hooks specified by Codex audit §1.9 must be built in at that time:

- Cert snapshot includes `language`.
- Renderer accepts a locale.
- Template selection is language-aware (or template has language-neutral layout + dict-driven text).
- Email sender accepts the attempt's frozen language.
- Public verification renders from the snapshot's language, **not** the current platform setting.

The snapshot already carries the locale-resolved text per-attempt, so the displayed candidate name / course / topics already follow attempt language — what's missing is only the SVG chrome and email shell.

---

## 9. German translation provenance + QA

The German copy in `messages.de.json` was authored by Claude (not by a human native speaker). Tone is mid-formal, plural-friendly ("Kandidat:in" / "Teilnehmer:in" — note inclusive colon form). Fitness/methodology terms are translated by domain norm (e.g. "Teilnehmende" for "participants" in a course context).

**Recommended QA before going live to candidates:**

1. Have the client (Max — German native) read every candidate-facing key (`candidate.*`, `attempt.*`, `verify.*`, `auth.*`).
2. Glossary the certification-specific vocabulary so future strings stay consistent.
3. Visual QA: long German strings can break narrow layouts (especially headers, table cells, buttons). Walk the attempt + result + hub at desktop and mobile widths.
4. Cert/email copy will need DE pass when Slice 6 lands.

---

## 10. Adding a third locale

Don't do this casually. It changes the type of `Locale` and the DB constraints. Steps:

1. Update `type Locale = 'de' | 'en' | 'xx'` in `src/types/database.ts`.
2. Migration: extend the `platform_settings` CHECK constraints (`enabled_languages <@ array['de','en','xx']`, `active_language = any(array['de','en','xx'])`) and the `attempts.language` CHECK. Both currently hard-code the supported set inline.
3. Migration: add `_xx` columns for every translatable field (mirror migration 0003).
4. Update `pickLocalized` — already generic; will work as-is for the new column suffix.
5. Add `src/lib/i18n/messages.xx.json` (same key set as DE/EN; key parity test will enforce).
6. Update `getEnabledLanguages` filter (currently casts via `isLocale` which is `de|en` only).
7. Update admin forms' showEnglish prop — generalise to `enabledLanguages: Locale[]` so they render N inputs.
8. Locale-aware date formatter: add the BCP-47 mapping in `src/lib/utils.ts`.
9. Slice 6 cert + email templates need a third variant.

---

## 11. Coordination with Slice 6 (Certificate Output System)

Slice 6 is parked. The Codex audit explicitly required Slice 6 to ship with language hooks built in (audit §1.9 [blocker]). When Slice 6 starts, read:

- `docs/CERTIFICATE-OUTPUT.md` — the slice's own spec.
- `docs/codex-audit-multilanguage.md` §1.9 — minimum language hooks.
- This document, §8 Gap 4 — what's still English in the cert path.

The migration numbering: Slice 6 lands as `0004_certificate_assets.sql` (since `0002` = settings, `0003` = localised content columns).

---

## 12. Tests and pre-flight

```
pnpm test       # 66 tests; covers pickLocalized, dict parity, attempt-lifecycle freeze
pnpm typecheck  # strict
pnpm build      # Next 16 production build
```

When adding a new locale or new dict keys, the parity test (`src/lib/i18n/__tests__/i18n.test.ts` — "DE and EN dicts share the same key set") will fail if you forget to mirror a key. Use this as a forcing function.

---

## 13. Surface for the superadmin

The single control point: `/admin/settings/language`. Sidebar entry visible only to superadmin (gated by the `Sidebar` component's `isSuperadmin` prop). Route guarded by `requireSuperadmin()`. Settings hub card also superadmin-gated.

Three actions:
- **Enable English** — adds `'en'` to `enabled_languages`. Triggers a re-render that surfaces the second admin-form input per translatable field.
- **Disable English** — only available when EN is enabled and not active. Removes `'en'`. EN content already stored stays in the DB but admin forms hide the EN input.
- **Switch active language** — flips `active_language`. Affects every candidate-facing render on the next request. In-progress attempts unaffected (L4).

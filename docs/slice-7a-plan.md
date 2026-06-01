# Slice 7a — Multilanguage foundation (German-first)

**Date:** 2026-06-01
**Status:** Planning → implementation
**Inputs:** `docs/codex-brief-multilanguage.md`, `docs/codex-audit-multilanguage.md`

This slice lands the smallest safe foundation that:
- introduces the typed `platform_settings` row,
- gives every attempt its own frozen language captured at start (not at submit),
- stands up the i18n runtime + DE baseline dictionary, and
- carries tests for the two load-bearing invariants (settings constraint + attempt-language freeze).

It deliberately does **not** touch certificate rendering, certificate emails, or public verification — those land inside Slice 6 (audit §1.9, §1.10 [blocker]).

---

## 1. Scope

### In
- Migration `0002_platform_settings_and_attempt_language.sql`:
  - `public.platform_settings` (single-row, typed, fully constrained).
  - `public.attempts.language` (frozen-at-start, constrained to supported set).
- Attempt-start lifecycle: a new server-only helper creates **or resumes** an in-progress `attempts` row the moment the candidate hits the attempt page. `language` is captured from `platform_settings.active_language` at that instant and pinned to the row.
- `submitAttempt` / `recordAttempt` refactored to **update** the in-progress row (no longer insert at submit).
- i18n runtime: `src/lib/i18n/` exporting `getActiveLanguage()`, `getServerT()`, `messages.de.json`, `messages.en.json`. Server-only. React `cache()` for per-request dedup.
- DE baseline dictionary — only the small set of keys the new code-path uses. Full string-harvest is intentionally deferred.
- Vitest coverage for the two load-bearing invariants (see §6).

### Out (deferred by design)
- Superadmin **Settings → Language** UI page (next slice — the migration seeds the only row, no UI is required to ship 7a).
- `*_de` / `*_en` columns on content tables (`courses`, `questions`, …) → Slice 7b.
- Cert + email + verification localization → folded into Slice 6 (see §3).
- Full English-string harvest across admin chrome + candidate chrome → rolling work across 7b/7c.
- Stored `account_history.event_label` policy change → tracked, not done here.
- Translation completeness / "EN activation readiness" checks → land with the superadmin UI.

---

## 2. Open-question resolutions

Codex flagged five questions whose answers must exist before code lands. Picks below; rationale terse:

1. **Retry after global language flips** → **new** active language. Attempt-scoped freeze is the locked invariant (L4 + audit §1.4 [blocker]); the assignment carries no language.
2. **Abandoned in-progress attempt** → **resume the same in-progress row** while `submitted_at IS NULL`. Its frozen language persists. After submit (pass or fail), the next retake creates a new attempt in the then-current active language.
3. **Admin manual pass without a candidate attempt** → **out of scope** for 7a. To be answered when admin manual-pass UI is next touched. (Most likely: admin picks language at the time of manual pass.)
4. **Topic-level recommendation copy** → stays question-level. No new column on `course_topics` in this slice. The audit notes that promoting it to a topic-level field is a product question, not a localization one (audit §1.1).
5. **EN activation: block or warn?** → **warn + DE fallback**, when the superadmin UI exists. Not relevant in 7a.

---

## 3. Sequencing with Slice 6

Slice 6 (Certificate Output System) is parked. The audit makes it explicit that cert templates / cert snapshots / verification / email cannot be designed independently of multilanguage (audit §1.9 [blocker]).

**Decision for 7a:** Slice 7a touches **none** of `src/lib/certificate/**`, `src/lib/email/**`, or `src/app/verify/**`. There is no collision in this slice.

**Decision for 7c:** what was originally planned as "Slice 7c — emails + cert per-language" is folded into Slice 6. When Slice 6 ships, it ships with: certificate snapshot includes `language`, renderer accepts a locale, email sender accepts a locale, template selection is language-aware, public verification renders from the snapshot's language (not the live global setting). This avoids rewriting the renderer twice.

---

## 4. Migration numbering

- `0001_core_schema.sql` — live, applied.
- `0002_platform_settings_and_attempt_language.sql` — **this slice.**
- Slice 6, when it ships: `0003_certificate_assets.sql` (was originally planned as 0002).
- Slice 7b (content `_de`/`_en` columns): `0003` or `0004` depending on Slice 6 timing.

`docs/ROADMAP.md` is updated to reflect this.

---

## 5. Migration 0002 — exact SQL

```sql
-- 0002_platform_settings_and_attempt_language.sql
-- Adds the typed single-row platform_settings table that drives the multilanguage
-- feature flag, plus a language column on `attempts` so an in-progress attempt
-- freezes its language at start.

set search_path = public;

-- --- platform_settings ----------------------------------------------------
create table public.platform_settings (
  id                 boolean primary key default true check (id = true),
  active_language    text     not null default 'de',
  enabled_languages  text[]   not null default array['de'],
  updated_at         timestamptz not null default now(),
  -- Supported set: extend this and the attempts CHECK below when adding locales.
  constraint platform_settings_languages_supported
    check (enabled_languages <@ array['de','en']::text[]),
  constraint platform_settings_languages_nonempty
    check (cardinality(enabled_languages) > 0),
  constraint platform_settings_active_supported
    check (active_language = any(array['de','en']::text[])),
  constraint platform_settings_active_in_enabled
    check (active_language = any(enabled_languages))
);

insert into public.platform_settings (id) values (true)
  on conflict (id) do nothing;

create trigger trg_platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

-- Read: anon + authenticated. The candidate flow reads via service-role (RLS-bypassing),
-- but exposing the active language to anon is harmless and keeps the table observable.
create policy "platform_settings_read_any"
  on public.platform_settings
  for select to anon, authenticated using (true);

-- Write: superadmin only.
create policy "platform_settings_update_superadmin"
  on public.platform_settings
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
-- No insert/delete policy → only the migration's seed insert is allowed.
-- Service-role bypasses RLS, so the migration insert succeeds.

-- --- attempts.language ----------------------------------------------------
-- Frozen at attempt start. Defaults to 'de' so any pre-7a row is well-formed.
alter table public.attempts
  add column language text not null default 'de'
    constraint attempts_language_supported
      check (language = any(array['de','en']::text[]));

comment on column public.attempts.language is
  'Language captured at attempt start from platform_settings.active_language. '
  'Frozen for the lifetime of the attempt; mid-flight platform toggles do not change it.';
```

---

## 6. File-level changes

### New
| Path | Purpose |
|---|---|
| `supabase/migrations/0002_platform_settings_and_attempt_language.sql` | SQL above. |
| `src/lib/i18n/index.ts` | `type Locale = 'de' \| 'en'`; `getActiveLanguage()` (service-role, `cache()`-wrapped); `getServerT(locale)`; `t(messages, key, params?)`. Server-only (`import "server-only"`). |
| `src/lib/i18n/messages.de.json` | DE keys used by 7a only (no broad harvest). |
| `src/lib/i18n/messages.en.json` | Same key shape; English copy. |
| `src/lib/certification/attempt-lifecycle.ts` | `startOrResumeAttempt(context)` server-only helper. Finds an in-progress attempt for the assignment (`submitted_at IS NULL`); else inserts one with `attempt_number = next`, `language = active language now`. Returns `{ id, attempt_number, language }`. |
| `src/lib/i18n/__tests__/i18n.test.ts` | Dict-load + `t()` fallback tests. |
| `src/lib/certification/__tests__/attempt-lifecycle.test.ts` | Resume-vs-create branch + freeze-on-flip behavior, with a small in-memory Supabase fake. |

### Modified
| Path | Change |
|---|---|
| `src/types/database.ts` | Add `platform_settings` row type; add `language: 'de' \| 'en'` to `attempts.Row`. |
| `src/lib/certification/data.ts` | `recordAttempt` becomes "update existing in-progress attempt by id". `attempt_number` no longer computed at submit. Accepts the attempt id (and language) from the caller. |
| `src/app/certification/[accessToken]/attempt/page.tsx` | Calls `startOrResumeAttempt` before render. Stashes the attempt id in a hidden form input alongside the existing `question_order` / `option_order` fields. |
| `src/app/certification/[accessToken]/actions.ts` (`submitAttempt`) | Reads the attempt id from form data, validates it belongs to this assignment + is still in progress, then calls `recordAttempt` with it. |
| `docs/ROADMAP.md` | Migration-numbering note; Slice 7 entry. |
| `CLAUDE.md` | One-line pointer to this slice. |

### Explicitly untouched (collision check)
- `src/lib/certificate/**`
- `src/lib/email/**`
- `src/app/verify/**`
- `src/lib/certification/scoring.ts` (the `"General"` fallback label stays English for now; harvested later)
- All admin chrome strings

---

## 7. Tests

### `src/lib/i18n/__tests__/i18n.test.ts` (Vitest, pure)
- `t(dict, "known.key")` returns the dict value.
- `t(dict, "missing.key")` returns the key itself (no crash, no cross-locale leak).
- Param interpolation: `t(dict, "hello", { name: "Ada" })` substitutes.

### `src/lib/certification/__tests__/attempt-lifecycle.test.ts` (Vitest, pure)
Tiny in-memory Supabase fake (functions that return `{ data, error }` for the few methods used). Cases:
- No in-progress row → inserts one with `attempt_number=1` and `language=<mocked active language>`. Returns it.
- In-progress row exists (`submitted_at IS NULL`) → returns existing row; **no insert**.
- In-progress row's language survives a simulated platform-settings flip between calls (resume returns the original language).
- After the in-progress row gets `submitted_at` set, the next call **inserts a new row** with `attempt_number=2` and the **then-current** active language.

### DB-level invariants (documented, not auto-run)
The four `platform_settings` CHECK constraints are documented in the migration. A Supabase SQL-editor smoke after applying the migration:
```sql
-- Should each raise an error:
insert into platform_settings (id, active_language) values (true, 'fr');
update platform_settings set enabled_languages = '{}' where id = true;
update platform_settings set active_language = 'en' where id = true; -- en not enabled yet
```

---

## 8. Workflow

1. Write code + tests locally.
2. `pnpm test` + `pnpm typecheck` + `pnpm build` — all green.
3. Commit. **Do not push yet** — migration 0002 must be applied to the live Supabase project first or the deploy will fail at runtime.
4. Hand back to user: "apply `supabase/migrations/0002_platform_settings_and_attempt_language.sql` via the live Supabase SQL editor; confirm `select * from public.platform_settings;` returns one row with `active_language='de'`, `enabled_languages={de}`."
5. On confirmation, push → Vercel deploys.
6. Smoke: complete one candidate attempt end-to-end on the live site, confirm no regression.

### Stop conditions
- If anything in `src/lib/certificate/**`, `src/lib/email/**`, or `src/app/verify/**` looks like it must change to make 7a work → stop, explain, do not edit.
- If a test discovers a real invariant violation I hadn't predicted → stop, explain, do not paper over.

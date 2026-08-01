@AGENTS.md

# Invest in Strength — Certification Platform

Standalone certification management platform. Admins build courses and seminars,
topics, a question bank, and questionnaires; candidates take assessments via a
personal link and receive a verifiable certificate. **The central object is the
certification _assignment_ (one participant + one questionnaire + one token), not
the questionnaire — do not treat this as a generic quiz app.**

**Two certification kinds, one table.** A `courses` row is either a multi-module
`course` or a single-event `seminar` (`courses.kind`). They certify through the
exact same chain (topics → questions → questionnaire → assignment → attempt →
certificate); only the admin section, the copy, the event date and the
certificate template differ. See `docs/SEMINARS.md` before touching either.

## Stack
- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`)
- Supabase: Postgres + Auth + Storage; `@supabase/ssr` for cookie sessions
- Zod for validation
- pnpm

## Next.js 16 notes (differs from older versions)
- **`proxy.ts` replaces `middleware.ts`** (root `src/proxy.ts`, exports `proxy`).
- `cookies()`, `headers()`, route `params`, and `searchParams` are **async** — `await` them.
- Proxy is **optimistic only**. The real auth gate is `requireAdmin()` (run in
  the admin layout and inside every Server Action). Server Actions POST to their
  own route, so a proxy matcher change can silently skip them.

## Architecture
- `src/lib/supabase/server.ts` — cookie/anon client for Server Components &
  Actions. Use this for all admin reads/writes (runs under RLS).
- `src/lib/supabase/client.ts` — browser client.
- `src/lib/supabase/service.ts` — **service-role** client. Bypasses RLS,
  `server-only`. Reserved for later anonymous flows (attempts, verification). Not
  used in Slice 1.
- `src/lib/supabase/proxy.ts` — session refresh helper for the proxy.
- `src/lib/auth/admin.ts` — `requireAdmin()` / `getAdminUser()`.
- `src/lib/form.ts` — `FormState` shape + Zod error flattening for `useActionState`.
- `src/components/ui/*` — small hand-rolled primitives (no component library).
- `src/components/admin/*` — admin chrome (sidebar, page header, action button).
- Admin features live in `src/app/(dashboard)/admin/<feature>/` and follow the
  same shape: `schema.ts` (Zod), `actions.ts` (`"use server"`), a client form,
  and server-component pages.
- Login is in `src/app/(auth)/admin/login/` (route group, so it does NOT inherit
  the admin chrome layout).

## Security model
- RLS is enabled on **every** table; admin access is gated by `public.is_admin()`
  (membership in `admin_profiles`). There are no anon policies — public flows
  will use the service-role key in trusted server code later.
- Admin provisioning is **superadmin-only, in-app** (locked decision). The
  Slice-1 auto-admin trigger (`handle_new_admin`) is being **removed in
  Slice 1.5** — do NOT assume "every auth user is an admin". `requireAdmin()`
  will verify `admin_profiles` membership; `requireSuperadmin()` gates admin
  management.
- Participants do **not** use Supabase Auth; they use unguessable `access_token`s
  on `certification_assignments`.
- Service-role key must never reach the browser (never prefix `NEXT_PUBLIC_`).

## Conventions
- Keep business logic in `actions.ts` / `lib`, not in UI components.
- Validate all input with Zod at the Server Action boundary.
- Mutations call `requireAdmin()` first, then `revalidatePath()`.
- Simple mutations (toggle/delete) use the `ActionButton` component;
  create/edit use `useActionState` + `FormState`.

## Database
- Migrations:
  - `0001_core_schema.sql` — full model.
  - `0002_platform_settings_and_attempt_language.sql` — Slice 7a multilanguage
    foundation (typed `platform_settings` single-row table; `attempts.language`
    frozen at attempt-start).
  - `0007_seminars.sql` — the Seminar certification kind. Adds `courses.kind`
    (`course` | `seminar`), `courses.event_date` (seminars only, printed on the
    certificate) and `courses.certificate_template_id` (per-seminar artwork).
  - `0003_localized_content_columns.sql` — Slice 7b. Adds `_de`/`_en` text
    columns to `courses`, `course_topics`, `questions`, `question_options`,
    `questionnaires`. Backfills `_de` from the legacy column. Updates
    `guard_questions_update` to include the new localized columns in the
    locked-content check. Old single-language columns kept (no-op).
- Hand-maintained types in `src/types/database.ts` — **keep in sync with the
  migration**. Can be replaced with `supabase gen types` output later.

## Multilanguage — fully shipped, DE-first
Slice 7 (a + a-plus + b + c + d + d-rest) is **shipped end-to-end**. The
platform is bilingual DE/EN with German as the default. The full state of
the art — architecture, every wired surface, known gaps, how to extend —
lives in **`docs/multilanguage-state.md`**. Read that before touching any
i18n surface, adding new admin/candidate pages, adding translatable
content fields, or starting Slice 6.

Quick orientation:
- Active language lives in `public.platform_settings` (single row,
  superadmin-only writes). Read via `getActiveLanguage()` /
  `isEnglishEnabled()` from `src/lib/i18n/`.
- Attempt language is frozen on `attempts.language` at attempt-start
  (`src/lib/certification/attempt-lifecycle.ts`). The candidate flow
  reads this, not the live setting.
- Translatable content has `_de` / `_en` columns (migration 0003); reads
  go through `pickLocalized` (`src/lib/i18n/content.ts`); writes dual-write
  legacy + `_de` always, plus `_en` when the superadmin has enabled EN.
- UI chrome strings live in `src/lib/i18n/messages.{de,en}.json`. Server
  components use `getServerT()`; client components use `useT()` from
  `src/lib/i18n/client`.
- The superadmin's only control point is `/admin/settings/language`
  (hidden from non-superadmin).
- Known English-only gaps (Zod inline messages, FormState returns,
  account_history.event_label, Slice 6 cert/email chrome): documented
  in `docs/multilanguage-state.md` §8 with playbooks for closing them.

Plan + audit: `docs/slice-7a-plan.md`, `docs/codex-brief-multilanguage.md`,
`docs/codex-audit-multilanguage.md`.

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint

## Status & roadmap
- **Academy scope package (2026-08-01): `docs/academy/README.md`** — full audit of
  code + live production, capability matrix for the academy expansion (learning,
  commerce, accounts), milestone plan M0–M6, decision + risk registers. Read it
  before planning new work; it also corrects several stale claims in THIS file and
  in `docs/ROADMAP.md` (e.g. durable Upstash rate limiting, Slice 6 PDF/PNG,
  template CRUD, and email verification are all SHIPPED; ~171 unit tests exist).
- **MVP slices 1, 1.5, 2, 3, 4, and 5 are all complete.** Foundation, admin auth,
  content CRUD, hardening, participants + assignments, candidate attempt flow,
  certificate generation, public verification, and Resend email delivery are done.
- **Verified end-to-end against a live Supabase project + Resend domain
  (2026-05-29) — the full flow works.**
- **Top pre-launch item: a UI/UX + functionality polish sweep** across all
  surfaces (client-flagged). Other cross-cutting items: durable rate-limit store,
  server-side PNG/PDF + Storage, certificate-template CRUD, automated tests,
  candidate email verification. See `docs/ROADMAP.md`.
- Certificates (current/interim): rendered SVG frozen into
  `certificate_public_snapshot` at issue (`src/lib/certificate/{render,issue}.ts`);
  never shows the score. Email via `src/lib/email/certificate-email.ts` (Resend;
  disabled gracefully when RESEND_API_KEY is unset). Public verify by token (QR)
  or by ID (`/verify`).
- **Planned: Certificate Output System** (scope expanded 2026-05-30) — official
  **PDF** + PNG preview + **Instagram Story PNG**, stored in Supabase Storage via
  a new `certificate_assets` table + typed templates. Spec:
  **`docs/CERTIFICATE-OUTPUT.md`**; plan: "Slice 6" in `docs/ROADMAP.md`. Don't
  build the renderer until that slice is explicitly started.
- Candidate flow is `src/app/certification/[accessToken]/*`; it is UNauthenticated
  and reads via the service-role DTO layer `src/lib/certification/data.ts`
  (explicit field selection only — never `select("*")`, never expose
  scores/answers/email/admin notes beyond what each surface needs). Scoring is
  pure in `src/lib/certification/scoring.ts`.
- Rate limiting (`src/lib/rate-limit.ts`) is in-memory only — must be backed by a
  durable store before production.
- Full slice plan, locked decisions, and the Codex audit response live in
  **`docs/ROADMAP.md`** (read before starting new work). Raw audit:
  **`AUDIT_FOR_CLAUDE.md`**.

Hardening already applied (don't re-flag): no auto-admin (superadmin creates
admins in-app); `requireAdmin`/`requireSuperadmin` verify an active
`admin_profiles` row; `account_history` append-only (policies + trigger);
archive-first guarded deletes (hard delete only for unused records); DB triggers
enforce topic↔course, question↔questionnaire-course, and content locking (a
questionnaire/question used by an assignment is frozen); assignment uniqueness
index; `certification_assignment_topics` join table; `certificate_public_snapshot`.

Deferred (tracked in roadmap): full RPC transactionalization of multi-step writes,
automated tests, rate limiting (Slice 3).

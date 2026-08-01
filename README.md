# Invest in Strength — Certification Platform

Standalone certification management platform for Invest in Strength
(`investinstrength.academy`). Admins build courses, topics, a reusable question
bank, and questionnaires; candidates take an assessment via a personal link and
receive a verifiable certificate.

> The central object is the **certification assignment** (one participant + one
> questionnaire + one access token) — this is not a generic quiz app.

## Tech stack

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres, Auth, Storage) via `@supabase/ssr`
- Zod validation
- pnpm

## Prerequisites

- Node 20+ and pnpm
- A Supabase project

## Setup

1. **Install**

   ```bash
   pnpm install
   ```

2. **Environment** — copy the example and fill in your Supabase keys
   (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Notes |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Public project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS protects data) |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Never expose to the browser |
   | `NEXT_PUBLIC_SITE_URL` | e.g. `http://localhost:3000`. Validated at boot — it is frozen into certificate QR codes, so a wrong value mints permanently broken certificates |
   | `RESEND_API_KEY` | Transactional email. Unset ⇒ email disabled (candidates cannot verify their address, so they cannot sit an exam) |
   | `RESEND_FROM` | Verified sender, e.g. `INVEST IN STRENGTH <noreply@yourdomain>` |
   | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Durable rate limiting. Optional locally; unset ⇒ per-process fallback. On Vercel the Upstash integration supplies `KV_REST_API_URL` / `KV_REST_API_TOKEN` instead — the limiter accepts either pair |

3. **Database** — apply all migrations with the Supabase CLI (they are tracked;
   do not paste SQL into the dashboard editor):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Migrations live in `supabase/migrations/` (`0001` … `0008`). On a project
   whose schema was applied by hand, baseline first with
   `supabase migration repair --status applied 0001 … 000N`.

4. **Disable public signup** in Supabase (Authentication → Providers / settings).
   Admins are created in-app by a superadmin; there is no self-service signup.

5. **Seed the first superadmin** (run once, as the postgres/service role):

   1. Authentication → Users → **Add user** (email + password).
   2. Insert their profile:

      ```sql
      insert into public.admin_profiles (id, email, role)
      values ('<auth-user-uuid>', '<email>', 'superadmin');
      ```

   That superadmin can then create other admins from **Settings → Administrators**.

6. **Run**

   ```bash
   pnpm dev
   ```

   Sign in at `/admin/login`.

## Scripts

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint

## Security model

- RLS is enabled on **every** table; admin access is gated by `public.is_admin()`
  (an **active** row in `admin_profiles`). Admin management is superadmin-only
  (`public.is_superadmin()`).
- No auto-admin: admins exist only via the in-app superadmin flow or the manual
  seed above. Participants never use Supabase Auth — they use unguessable
  `access_token`s.
- `account_history` is append-only (insert/select policies + a hard DB trigger).
- Relational integrity (topic↔course, question↔questionnaire course) and content
  locking (a questionnaire/question used by an assignment is frozen) are enforced
  by database triggers, not just the app.
- The service-role key bypasses RLS and must stay server-side (`server-only`).

## Project layout

- `src/app/(auth)/admin/*` — login + no-access (no admin chrome)
- `src/app/(dashboard)/admin/*` — protected admin app (each feature: `schema.ts`,
  `actions.ts`, a client form, server-component pages)
- `src/lib/supabase/*` — server / browser / service-role / proxy clients
- `src/lib/auth/*` — `requireAdmin()` / `requireSuperadmin()` + auth actions
- `src/components/{ui,admin}/*` — primitives and admin chrome
- `supabase/migrations/*` — schema (source of truth)
- `src/types/database.ts` — hand-maintained DB types (keep in sync with the
  migration; can be replaced with `supabase gen types` once connected)

## Roadmap

**Start with `docs/academy/README.md`** — the current audit, capability matrix,
milestone plan (M0–M6) and decision register. It supersedes the older documents
where they disagree.

`docs/ROADMAP.md` holds the original slice plan and locked decisions, and
`AUDIT_FOR_CLAUDE.md` the foundation audit. Current status: the certification
platform is **live in production** (slices 1–7 + Seminars + Certificate Output
MVP shipped); work in progress is milestone **M0 — production truth and
stabilization**.

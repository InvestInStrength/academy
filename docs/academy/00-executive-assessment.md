# Executive assessment — Invest in Strength → Academy platform

**Date:** 2026-08-01 · **Basis:** full code audit (7 subsystem sweeps), read-only probes of the
live database and site, docs-vs-code reconciliation. Confirmed facts are cited; assumptions are
marked. This is deliverable 1 of the scope package (see `README.md` in this folder).

---

## 1. What exists today

The live system at `investinstrength.academy` is a **certification and assessment engine** —
not a learning platform, not a store. Its central object is the **certification assignment**
(one participant + one questionnaire + one unguessable token), exactly as CLAUDE.md describes.

Verified live production state (2026-08-01, read-only service-role probe):

| Fact | Value |
|---|---|
| Participants / assignments / attempts | 17 / 20 / 23 (21 submitted) |
| Certificates (all valid, none revoked) | 9 — all with PDF + PNG assets |
| Courses | 2 (1 course, 1 seminar) · 44 questions · 2 questionnaires (both 80 % threshold) |
| Admins | 3 (1 superadmin + 2 admins) |
| Migrations 0001–0007 applied in prod | **Yes, all** (incl. the "Founder must apply" 0005/0006) |
| Storage bucket `certificates` | exists, **public** |
| Languages | German only; English has **never** been enabled |
| Data invariants (passed-without-cert, double-open attempts, relative verify URLs, dup emails) | **all clean — zero violations** |

Working end-to-end today: admin content CRUD (courses/seminars, topics, question bank,
questionnaires, certificate-template CRUD), participant + assignment management with auto
invite email, candidate flow (token → email OTP → attempt with autosave → server-side grading
→ result → certificate), manual pass with synthetic 100 % attempt, certificate issuance with
frozen `certificate_public_snapshot`, server-side PDF/PNG generation (resvg + pdf-lib) into
Supabase Storage, QR + by-ID public verification, revoke/reinstate, three Resend emails,
DE/EN i18n plumbing, durable Upstash rate limiting **in code**, and 171 unit tests on the pure
logic layers.

## 2. What is reliable

- **The certification data model.** Snapshots at every step (attempt, answers, certificate),
  DB-enforced content locking once a questionnaire is assigned, append-only `account_history`,
  topic↔course and question↔course integrity triggers, RLS on all 17 tables with no anon
  policies (`supabase/migrations/0001_core_schema.sql`). Production data confirms it: zero
  invariant violations.
- **Auth layering.** Optimistic proxy + real `requireAdmin()`/`requireSuperadmin()` gate
  verified at the top of all 36 admin server actions (`src/lib/auth/admin.ts`).
- **Grading integrity.** Server-side grading from DB truth only; `is_correct` never reaches the
  client; per-questionnaire threshold frozen by trigger (`src/lib/certification/scoring.ts`,
  `data.ts`).
- **The candidate DTO discipline.** Explicit field selection, constant-shape anti-probing,
  never `select("*")` on the anonymous path (`src/lib/certification/data.ts`).
- **Unit-test layer.** 17 files / ~171 cases covering scoring, schemas, i18n, SVG
  sanitization/rendering, email builders, OTP logic, rate-limit backends.

## 3. What is fragile

Ranked by real-world consequence:

1. **The platform is operationally blind.** Zero logging (`grep console\. src/` → 0 hits), no
   error tracking, no error boundaries, no health endpoint (there are **no API routes at
   all**), no CI (push-to-main deploys), no scheduled jobs, migrations pasted by hand into the
   SQL editor. A production incident would be discovered by a user, not by the system.
2. **Stored XSS, admin → candidate.** `t()` does raw substitution and two candidate pages
   render the questionnaire title via `dangerouslySetInnerHTML`
   (`src/lib/i18n/dict.ts:33-35`, `certification/[accessToken]/page.tsx:56`,
   `result/page.tsx:92`). Any admin can execute script in every candidate's browser.
3. **Certificate issuance has silent dead-ends.** Non-transactional multi-step sequence; if the
   `certificates` insert fails after an assignment flips to `passed`, the candidate sees
   "being prepared" forever and **no retry path exists anywhere**
   (`src/lib/certificate/issue.ts:167-169`). Asset generation runs inline in the candidate's
   submit request (300-DPI native render + 2 uploads) — the most likely timeout/OOM point.
4. **Revocation doesn't revoke the artifact.** Revoked certificates' pristine PDFs stay
   publicly downloadable at stable URLs in the public bucket
   (`src/app/(dashboard)/admin/certificates/actions.ts:49-57`, `src/lib/certificate/storage.ts`).
5. **Rate limiting fails open.** Durable Upstash backend exists in code but activates only via
   env vars that are absent locally and **unverifiable in the client-owned Vercel account**;
   fallback is per-instance memory (`src/lib/rate-limit.ts:105-121`).
6. **Race windows in attempt finalization.** Double-submit duplicates `attempt_answers` +
   history rows (0-row guarded update not checked); fail-path can overwrite `passed`
   (`src/lib/certification/data.ts:353-413`); no DB constraint against two open attempts.
7. **Silent admin mutations.** Every `ActionButton` action returns void and swallows failures
   (resend invite, reinstate, toggle, regenerate) — failure looks identical to success.
8. **Email truth ends at the Resend API.** No webhook receiver → bounces are recorded as
   success (`emailed_at` set).
9. **Documentation is materially stale.** CLAUDE.md/ROADMAP/README claim in-memory-only rate
   limiting, unbuilt Slice 6, 4 missing features that shipped, and one false claim (Slice-6
   multilanguage hooks) — a planning hazard confirmed line-by-line in the audit.

## 4. What is missing (relative to the target platform)

Entirely absent, no partial implementation anywhere:

- **All commerce**: Stripe, orders, payments, refunds, disputes, coupons, entitlements, access
  expiry. Zero payment code or docs mention (grep-verified).
- **All learning delivery**: modules, lessons, media, progress tracking, dashboards, drip,
  cohorts, glossary, search, notes, bookmarks, resource library.
- **Participant accounts**: participants have no login; access = permanent token link + email
  OTP. No password reset even for admins; no MFA.
- **Operational spine**: background jobs, webhook receivers, health checks, monitoring,
  alerting, reconciliation, smoke tests, backup verification, feature flags.
- **Role tiers beyond admin/superadmin**: no instructor, support, or read-only roles; no
  impersonation; no GDPR export/delete workflows (participant hard-delete is in fact
  *impossible* today — the append-only trigger aborts the FK cascade, worked around via SQL
  editor).
- **Assessment depth**: no question pools/sampling, no topic balancing, no cooldowns, no
  attempt invalidation, no admin attempt viewer, no analytics.

## 5. What is duplicated / conceptually overloaded

- `certification_assignments` currently plays four roles at once: enrollment, entitlement,
  exam ticket, and invitation (its token doubles as the permanent credential in invite
  emails). The target model must split these (see data-model proposal) — but the assignment
  itself should survive as the exam ticket.
- `certificates.file_url` is deprecated-but-present alongside `certificate_assets`.
- Assignment `status` duplicates attempt state badly: `in_progress` exists in the CHECK and
  types but is never written (confirmed in prod: only `not_started/passed/failed` occur).
- Template normalization logic is deliberately duplicated between
  `src/lib/certificate/template-import.ts` and `scripts/import-certificate-template.mjs`
  (hand-sync warning in code).
- Doc status lives in five places (CLAUDE.md, README, ROADMAP, spec docs, checklists) that
  contradict each other.

## 6. What blocks expansion

1. **No participant identity** — dashboards, purchases, portals, notes, GDPR all presuppose an
   account. This is the single deepest prerequisite.
2. **No entitlement concept** — nothing separates "may access" from "was assigned an exam".
   Payments cannot land safely without it.
3. **No jobs/webhook infrastructure** — Stripe, email truth, async certificate generation,
   reminders, and reconciliation all need the first API routes + an outbox/jobs table.
4. **No observability/CI** — changing a live credentialing system without error tracking,
   tests-in-CI, and health checks is how silent breakage happens; this must precede feature
   work.
5. **Admin console scalability** — every list loads all rows, no search/pagination/bulk; fine
   at 17 participants, a wall at 200.

## 7. Recommended platform direction

Evolve, don't rewrite. The certification chain is the best-engineered part of the system and
is exactly the hard part of a credentialing academy; keep it intact and **layer around it**:

- Participant **accounts on Supabase Auth**, additive (`participants.auth_user_id`), claim
  existing profiles by verified email; the token flow remains as the exam-access mechanism.
- New **enrollment** (registration fact) and **entitlement** (authoritative access record,
  explicit state machine) entities; assignments gain an `enrollment_id`.
- **Stripe Checkout + webhook → order → entitlement**, server-authoritative; manual payments
  are real orders; coupons via Stripe promotion codes.
- **Jobs = Postgres outbox + Vercel Cron** (no new queue vendor); certificates and email move
  onto it with explicit states; Resend webhook feeds an `email_events` table.
- **Learning content extends `courses`** (modules → lessons), version-pinned at enrollment;
  video via a hosted provider (Mux/Bunny — client decision), not Supabase Storage.
- Single academy, **no multi-tenancy** (no foundation exists; target permits this).
- Full decisions with IDs: `08-decision-register.md`; architecture: `03-target-architecture.md`.

## 8. Recommended first implementation boundary

**M0 (stabilize what is live) → M1 (identity & access foundation) → then M2 (Stripe) or M3
(learning MVP) by client priority — that choice is decision D-01 and does not block M0/M1.**

M0 is not optional and touches no product features: fix the XSS, close the attempt races, add
the certificate re-issue path, decide revoked-asset handling, introduce Sentry + logging +
error boundaries + `/api/health`, CI before deploy, tracked migrations, backup verification,
and a production env audit (the Upstash question). Everything else builds on a platform that
can actually tell us when it is broken.

Full milestone backlog: `07-milestone-backlog.md`. Final recommendation and next action:
`11-implementation-recommendation.md`.

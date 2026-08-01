# Risk register — likelihood, impact, detection, mitigation, recovery

2026-08-01 · Compiled from the domain audits, verified production state (read-only probe
2026-08-01), and the milestone plan ([07](07-milestone-backlog.md)). Detection mechanisms reference
[05-production-safety-plan.md](05-production-safety-plan.md); decision IDs (D-xx) reference
[08-decision-register.md](08-decision-register.md).

Scales: **Likelihood** L (unlikely in the plan horizon) / M (plausible) / H (expected or already
occurring). **Impact** L (annoyance) / M (feature or candidate-level damage, recoverable) / H
(credential integrity, revenue, legal exposure, or unrecoverable loss). Sorted by impact, then
likelihood, descending. "Blocking status" states which milestone the risk holds up **until its
mitigation lands** — most mitigations are already scheduled work, which is the point of M0.

## Overview

| ID | Risk | L | I | Owner | Blocking status |
|---|---|---|---|---|---|
| R-01 | Silent production failure continues during build-out | H | H | Engineering | Blocks M1+ feature work (observability is an M0 exit criterion) |
| R-02 | Certificate issuance dead-end strands a live candidate | M | H | Engineering | Blocks nothing (fix is first-week M0 work) |
| R-03 | Stored XSS (admin content → candidate browsers) until M0 ships | M | H | Engineering | Blocks nothing (fix is first-week M0 work) |
| R-04 | Inline asset generation times out at the candidate's emotional peak | M | H | Engineering | Blocks nothing |
| R-05 | Migration drift from hand-applied SQL | M | H | Engineering | Blocks all schema-changing work until M0 tooling lands |
| R-06 | Stripe webhook misconfiguration: paid but no access | M | H | Engineering | Blocks M2 go-live until smoke-verified |
| R-07 | Single-maintainer bus factor | M | H | Joint | Blocks nothing |
| R-08 | Revoked-certificate assets remain publicly downloadable | L | H | Engineering | Blocks nothing (M0/M1 scope, D-04) |
| R-09 | Account-claim flow links the wrong person to a participant record | L | H | Engineering | Blocks M1 claim go-live until email constraint + controls land |
| R-10 | SITE_URL misconfiguration freezes broken URLs into immutable certificates | L | H | Engineering | Blocks nothing |
| R-11 | Backups unverified — restore may not work when needed | L | H | Engineering + client | Blocks M0 exit until one restore drill passes |
| R-12 | Vercel/Supabase account access split (client-owned accounts) | H | M | Client + engineering | Blocks M0 exit (prod env audit) until access granted |
| R-13 | Stale documentation misleads future work | H | M | Engineering | Blocks nothing (M0 docs truth pass) |
| R-14 | Rate limiting silently in-memory (Upstash unverified in prod) | M | M | Engineering | Blocks nothing (resolves with R-12) |
| R-15 | Email delivery blindness: bounces recorded as success | M | M | Engineering | Blocks nothing |
| R-16 | Entitlement cutover breaks existing token links | M | M | Engineering | Blocks the M1→M2 gating-cutover step only |
| R-17 | Jobs/outbox pipeline stalls after M1 adoption | M | M | Engineering | Blocks nothing |
| R-18 | GDPR erasure request arrives before the anonymization primitive | M | M | Joint | Blocks nothing |
| R-19 | Attempt-finalization races corrupt result data | L | M | Engineering | Blocks nothing (M0 DB guards) |
| R-20 | SVG sanitizer bypass reaches immutable snapshots | L | M | Engineering | Blocks nothing |

---

## R-01 — Silent production failure continues during build-out

**Risk.** The live platform has zero logging (`grep console\.` across `src/` → 0 hits), no error
tracking, no error boundaries, no health endpoint, and no API routes at all; every failure idiom
swallows the error and shows a generic message (ops-testing audit). While M1+ actively changes this
system, any regression — a broken candidate submit, a failed certificate, a dead email path — is
discovered by a user, not by the system, and possibly weeks late. **Likelihood H** (this is the
current state, and change volume is about to rise sharply) · **Impact H** (undetected damage to a
credentialing product).

**Detection.** Today: none — that is the risk. Target: Sentry error tracking with alerting,
structured logging at every catch site, `error.tsx` boundaries, `/api/health` deep check, post-deploy
smoke test, scheduled synthetic candidate-flow check (05-production-safety-plan.md).

**Mitigation.** M0 lands the entire observability core **before** feature work begins — this
ordering is fixed in [11-implementation-recommendation.md](11-implementation-recommendation.md) §4.
Until then: no non-essential production changes.

**Recovery.** Per-incident, ad hoc (reproduce locally, inspect DB by hand) — expensive, which is why
mitigation precedes everything else.

**Owner.** Engineering. **Blocking:** blocks M1+ feature work; M0's own tasks proceed.

## R-02 — Certificate issuance dead-end strands a live candidate

**Risk.** If the `certificates` INSERT fails after an assignment flips to `passed` (transient DB
error, or the 3-try collision loop conflating the number-uniqueness and assignment-uniqueness
constraints under concurrent submits), `issueCertificate` returns null **unlogged**
(`src/lib/certificate/issue.ts:167-169`); the candidate sees "being prepared" forever, the admin sees
a static "certificate pending" with no button, `manualPass` refuses (already passed), and nothing
ever re-invokes issuance (certificates-email audit). Recovery today requires DB surgery.
**Likelihood M** (structurally possible on every pass; 9/9 prod certificates currently clean —
verified 2026-08-01) · **Impact H** (a real candidate denied their credential at the moment of
success, invisibly).

**Detection.** Target: Sentry alert on issuance failure + the reconciliation sweep
"passed assignments without certificate rows" (05-production-safety-plan.md), which currently
returns 0 in prod.

**Mitigation.** M0 (A-08): log every failure path, add an admin **re-issue action** for
passed-without-certificate assignments, fix the collision-loop to fetch the winner's row; M1 moves
asset generation onto the jobs outbox.

**Recovery.** Until M0: manual SQL (insert certificate via a re-run of the issuance logic) — runbook
in 05. After M0: one admin button.

**Owner.** Engineering. **Blocking:** blocks nothing — scheduled first-week M0 work.

## R-03 — Stored XSS (admin content → candidate browsers) until M0 ships

**Risk.** `t()` performs raw substitution with zero HTML escaping (`src/lib/i18n/dict.ts:33-35`) and
two candidate pages render the questionnaire title through `dangerouslySetInnerHTML`
(`src/app/certification/[accessToken]/page.tsx:56`, `result/page.tsx:92`). Any admin — or anyone
holding an admin's credentials, which today have no MFA, no reset flow, and superadmin-known shared
passwords (auth-security audit) — can execute script in every candidate's browser on the platform
origin. No CSP exists as a backstop (`next.config.ts:1-18`). **Likelihood M** (3 trusted admins, but
the account-compromise path multiplies it) · **Impact H** (session/credential theft on a
credentialing platform; total trust loss).

**Detection.** Hard by nature. Target: CSP violation reporting once M0 headers land; content review
of the 2 questionnaires/44 questions is minutes at current volume.

**Mitigation.** M0 first-week fix: escape `t()` parameters / remove `dangerouslySetInnerHTML` on
both pages, add CSP + security headers; M1 adds admin MFA (D-20) and credential lifecycle, cutting
off the compromise path.

**Recovery.** If exploited: remove the payload (edit the title), rotate all admin credentials,
invalidate sessions, audit `account_history` and `audit_log` for the window, notify affected
candidates.

**Owner.** Engineering. **Blocking:** blocks nothing — scheduled first-week M0 work.

## R-04 — Inline asset generation times out at the candidate's emotional peak

**Risk.** `submitAttempt → recordAttempt → issueCertificate → generateCertificateAssets` runs a
native 300-DPI resvg render (~3508×2481 px, several seconds cold) plus a PDF build and two Storage
uploads **inside the candidate's submit request** (`src/lib/certification/data.ts:406-407`,
`src/lib/certificate/issue.ts:189`; ops-testing audit). Function memory/time limits in the
client-owned Vercel account are unknown (R-12). An OOM/timeout here hits exactly at the pass moment;
depending on where it dies, the candidate gets an error screen after passing, with the
mid-sequence writes in an unknown state and — if the crash preempts the catch block — no failure
event at all. **Likelihood M** (works today per prod evidence, but cold starts + bigger templates +
rising traffic all push toward the cliff) · **Impact H** (worst possible moment; overlaps R-02's
dead-end).

**Detection.** Target: Sentry performance traces + Vercel function duration/memory alerts on the
submit route; synthetic candidate-flow check timing the submit step; reconciliation sweep for
passed-without-assets (05-production-safety-plan.md).

**Mitigation.** M0: explicit asset states (pending/complete/failed) + admin retry + failure logging
(A-08). M1: move rendering onto the jobs outbox (A-05) so submit returns immediately and the
certificate page polls real state — this removes the risk structurally.

**Recovery.** Admin "Regenerate files" (exists today) for asset failures; R-02's re-issue path for
the deeper failure; candidate messaging shows honest "in progress" state (M0 "no fake success").

**Owner.** Engineering. **Blocking:** blocks nothing.

## R-05 — Migration drift from hand-applied SQL

**Risk.** Migrations are pasted by hand into the Supabase SQL editor (README instruction;
ops-testing audit); nothing verifies prod schema against the repo. Project memory documents at least
one production intervention that disabled the append-only trigger to force a delete — precisely the
class of untracked change that later breaks assumptions silently, especially given the codebase's
error-swallowing idioms. Parity is confirmed **today** (all migrations 0001–0007 verified applied,
2026-08-01) but the process guarantees future divergence. **Likelihood M** · **Impact H** (code and
schema disagree in production; failures surface as silent nulls, or a disabled safety trigger stays
disabled).

**Detection.** Target: Supabase CLI migration tracking + an automated drift check (`supabase db
diff` against prod) in CI and on a schedule, plus a trigger-state check in the reconciliation sweep
(05-production-safety-plan.md).

**Mitigation.** M0 task 1 ([11](11-implementation-recommendation.md) §7): adopt tracked migrations
before the next schema change; all M1+ schema work flows through it. The M1 anonymization primitive
(R-18) removes the standing reason to touch prod SQL by hand.

**Recovery.** Diff prod against the migration set (the production-truth baseline from this audit is
the reference point), write a reconciling migration, re-verify invariants.

**Owner.** Engineering. **Blocking:** blocks all schema-changing work (i.e. effectively M1 start)
until the M0 tooling lands — which is why it is M0 task 1.

## R-06 — Stripe webhook misconfiguration: paid but no access

**Risk.** A-04 correctly makes the webhook the **only** grantor of access (the success page never
grants). The flip side: a misconfigured endpoint URL, wrong signing secret, wrong event selection, or
an unhandled event version means a customer pays and receives nothing — the exact failure that
destroys trust in a new store. These are the app's first-ever API routes (none exist today —
ops-testing audit), so there is no operational muscle memory. **Likelihood M** (classic
first-integration failure) · **Impact H** (real money taken, no delivery; consumer-law exposure per
D-14).

**Detection.** Target (05-production-safety-plan.md): reconciliation sweep comparing Stripe
payments against `orders`/`entitlements` (flags paid-without-access within minutes); alert on
webhook error rate and on `stripe_events` staleness; Stripe dashboard delivery-failure monitoring;
post-deploy smoke purchase in test mode.

**Mitigation.** Signature verification + `stripe_events` idempotency table in the first commit of
the Stripe slice (locked, capability matrix); distinct test/live keys enforced by the M0 boot-time
env schema; end-to-end test-mode purchase as an M2 acceptance criterion; go-live behind a checklist
including one real transaction.

**Recovery.** Stripe retains and can replay events; the reconciliation job grants the missing
entitlement automatically and flags the order; apology email via the jobs pipeline; refund path
exists if the customer already walked.

**Owner.** Engineering. **Blocking:** blocks M2 go-live until the smoke purchase and reconciliation
sweep are green; M2 build proceeds freely.

## R-07 — Single-maintainer bus factor

**Risk.** One developer holds the entire system context: architecture, the hand-run operational
scripts with hardcoded local paths (`scripts/update-certificate-template.mjs` reads from
`A:/WORK/KUNDEN/...`), the undocumented prod-intervention history, and the migration state. If they
become unavailable, the client owns a live credential platform nobody can safely change.
**Likelihood M** (life happens) · **Impact H** (platform frozen; incidents unresolvable).

**Detection.** Organisational, not telemetric. The proxy signal: how much knowledge exists only in
one head — this scope package is the measurement.

**Mitigation.** This documentation package (00–11) is the primary mitigation; M0 adds the rest:
CI-enforced tests, tracked migrations, runbooks in 05-production-safety-plan.md, and boot-validated
env vars — all of which convert tacit knowledge into executable process. Client-owned accounts
(R-12, correctly configured) mean no access dies with the maintainer.

**Recovery.** A competent successor onboards from the repo + this package; the M0 smoke tests and
health checks tell them immediately whether the system is healthy.

**Owner.** Joint (client owns continuity; engineering owns documentation quality). **Blocking:**
blocks nothing.

## R-08 — Revoked-certificate assets remain publicly downloadable

**Risk.** Revocation flips `certificates.status` only; the pristine official PDF/PNG stay at stable
public URLs in the public bucket (`src/app/(dashboard)/admin/certificates/actions.ts:49-57`,
`src/lib/certificate/storage.ts:12-37`; bucket confirmed public in prod 2026-08-01). Anyone who
saved the link — it is emailed — can serve a clean, overlay-free "valid-looking" credential
indefinitely after revocation. **Likelihood L** (0 revocations to date, 17 participants) · **Impact
H** (revocation is the platform's integrity backstop; a revoked-but-circulating official PDF defeats
it).

**Detection.** None possible today (public objects have no access log we consume). After A-09:
signed-URL issuance is logged and authorization denials are visible (05-production-safety-plan.md).

**Mitigation.** D-04 / A-09: private bucket + short-lived signed URLs, mediated by the verify page
and an authorizing download endpoint; scheduled in M0/M1 with a brief cutover
([06-migration-strategy.md](06-migration-strategy.md)).

**Recovery.** If a revoked certificate circulates meanwhile: delete the storage objects for that
certificate immediately (manual, irreversible but appropriate for revoked items); the verify page —
the only authoritative surface — already shows REVOKED.

**Owner.** Engineering (client sign-off via D-04). **Blocking:** blocks nothing; it is scheduled M0/M1 scope.

## R-09 — Account-claim flow links the wrong person to a participant record

**Risk.** M1's claim flow attaches a Supabase Auth user to an existing participant by verified
email (A-02). `participants.email` currently has **no uniqueness or format constraint**
(`supabase/migrations/0001_core_schema.sql:54-62`; database audit), and emails can be edited by
admins. A duplicate or mistyped email at claim time could hand someone else's certification history,
PII and certificates to the wrong account — an identity-model mistake, which the decisions brief
names as one of the two real risks of this whole programme. **Likelihood L** (with the planned
controls; prod currently has 0 duplicate emails across 17 participants — verified 2026-08-01) ·
**Impact H** (wrong person owns a stranger's credentials and personal data; GDPR breach).

**Detection.** Claim events written to the generalized `audit_log` (M1) and reviewed while volume is
small; support complaints; reconciliation check "auth_user_id set but claim event absent"
(05-production-safety-plan.md).

**Mitigation.** Ordered inside M1: (1) unique partial index on `lower(email)` **before** the claim
flow ships; (2) claim requires OTP to the stored address only — never a user-supplied one; (3) no
self-service email change before a completed claim; (4) manual review of the first 17 claims (the
entire existing population).

**Recovery.** Null the `auth_user_id` link, re-run the claim correctly; append-only history and the
new audit_log preserve what happened; notify affected parties if data was exposed (D-12 process).

**Owner.** Engineering. **Blocking:** blocks M1 claim-flow **go-live** until the email constraint
and controls land — an intra-M1 ordering dependency, not an external blocker.

## R-10 — SITE_URL misconfiguration freezes broken URLs into immutable certificates

**Risk.** If `NEXT_PUBLIC_SITE_URL` is unset/empty on a deploy, `verificationUrl()` silently returns
a relative path (`src/lib/public-url.ts:6-18`) which is frozen into the immutable
`certificate_public_snapshot` and rendered into the QR code. Every certificate issued during the
window is permanently broken — a scanned QR goes nowhere — and today there is no re-issue path
(R-02). Prod has never hit this (0 relative URLs across all snapshots — verified 2026-08-01), but
nothing prevents it: no boot validation exists. **Likelihood L** · **Impact H** (permanently
defective legal documents).

**Detection.** Target: M0 boot-time env validation makes the failure loud at deploy; post-deploy
smoke test renders a QR and asserts an absolute URL; the reconciliation sweep keeps the
zero-relative-URL invariant (05-production-safety-plan.md).

**Mitigation.** M0: fail-fast env schema (refuse to boot without an absolute SITE_URL), covering all
required vars (also RESEND_*, Stripe keys later).

**Recovery.** Re-issue affected certificates via the R-02 re-issue path (new snapshot, same
identity) and re-send; impossible before M0 lands that path.

**Owner.** Engineering. **Blocking:** blocks nothing.

## R-11 — Backups unverified: restore may not work when needed

**Risk.** The Supabase backup/PITR tier is unknown (client-owned account, unverifiable from here —
production-truth 2026-08-01) and no restore has ever been rehearsed. Certificates are legally
meaningful records; a botched migration or operator error with an unrestorable backup is
unrecoverable loss. Storage-bucket objects (certificate PDFs) have their own backup question.
**Likelihood L** (loss events are rare) · **Impact H** (permanent loss of credential records).

**Detection.** The M0 backup verification drill *is* the detection: confirm tier, take a backup,
restore to a scratch project, verify row counts + invariants; then repeat on a schedule
(05-production-safety-plan.md).

**Mitigation.** M0: confirm/raise the backup tier (with R-12 access), one full restore drill
including storage objects, documented restore runbook. Data is tiny (17 participants), so drills
cost minutes.

**Recovery.** If loss occurs before verification: best-effort from whatever Supabase retains plus
the immutable artefacts already delivered to candidates (emailed PDFs, snapshots) — genuinely
partial. That inadequacy is the argument for the drill.

**Owner.** Engineering + client (account tier/billing). **Blocking:** blocks M0 exit until one
restore drill passes.

## R-12 — Vercel/Supabase account access split (client-owned accounts)

**Risk.** Production Vercel (and the Supabase org) live in a separate client-owned account; prod env
vars **cannot be verified from the development side** — this is today, already, why the Upstash
question (R-14) is open and why function limits (R-04) are unknown (production-truth 2026-08-01).
During an incident, the person debugging may be unable to read logs, change env vars, or roll back
without a hand-off through the client. **Likelihood H** (the split is a present fact) · **Impact M**
(slows every audit and incident; multiplies other risks rather than causing damage itself).

**Detection.** Already detected — this audit could not complete the env verification. Ongoing:
M0's production env audit checklist has explicit owner sign-offs (05-production-safety-plan.md).

**Mitigation.** Client grants the developer member access to the Vercel project and Supabase org
(scoped, auditable — not credential sharing); env inventory documented in 05; alerting (Sentry,
uptime) configured to notify both parties independently of account access.

**Recovery.** Interim protocol: a named client contact executes dashboard actions on instruction;
acceptable for planned work, unacceptable for incidents — hence mitigation before first release.

**Owner.** Client (account owner) + engineering. **Blocking:** blocks M0 **exit** — the production
env audit and R-11's drill cannot complete without access.

## R-13 — Stale documentation misleads future work

**Risk.** The repo's planning docs contradict the code on load-bearing points: CLAUDE.md claims rate
limiting is "in-memory only" (a durable Upstash backend is merged), CERTIFICATE-OUTPUT.md says
"planned (not yet built)" for a shipped pipeline, and ROADMAP.md claims Slice-6 multilanguage hooks
that the code does not implement (`issue.ts:142-152` has no language field; `render.ts:53` hardcodes
en-GB) — docs-truth audit, confirmed line-by-line. Anyone — human or agent — planning from these
docs will mis-scope security-relevant work or "re-build" shipped features. **Likelihood H** (the
docs are read at the start of every session; the staleness is confirmed) · **Impact M** (wasted
work, wrong assumptions; one false claim touches an audit blocker).

**Detection.** This package *is* the detection. Ongoing: the docs-vs-code reconciliation becomes a
per-milestone exit item (05-production-safety-plan.md); PR checklist line "does this change a
documented claim?".

**Mitigation.** M0 docs truth pass: correct CLAUDE.md/ROADMAP/README/CERTIFICATE-OUTPUT against the
audited reality; declare ROADMAP the single status source; this package supersedes stale planning
prose.

**Recovery.** Re-run the docs-vs-code reconciliation (the docs-truth audit method is repeatable).

**Owner.** Engineering. **Blocking:** blocks nothing, but do it early in M0 — every later work
session inherits the hazard until it lands.

## R-14 — Rate limiting silently in-memory (Upstash unverified in prod)

**Risk.** The durable Upstash backend activates only when `UPSTASH_REDIS_REST_URL/TOKEN` are set and
**silently falls back** to a per-instance memory window otherwise — or on any Redis error
(`src/lib/rate-limit.ts:105-121`). The vars are absent locally and unverifiable in the client-owned
prod account (production-truth 2026-08-01): the single biggest unverified security variable. If
absent, login brute-force and OTP-guessing limits are effectively decorative across serverless
instances (the OTP flow retains its DB-backed 5-attempt cap as a real backstop; login has no such
backstop). **Likelihood M** (genuinely unknown; may already be configured) · **Impact M** (brute
force exposure on admin login; degraded abuse limits on public endpoints).

**Detection.** M0 prod env audit answers it definitively (needs R-12). Ongoing: `/api/health`
reports the active rate-limit backend, and a Sentry event fires on fallback — the silent downgrade
becomes loud (05-production-safety-plan.md).

**Mitigation.** M0: set the vars (or confirm them), add fallback visibility, add login lockout
(scheduled M0 scope — capability matrix, safety-security: "Rate limiting").

**Recovery.** Set env vars + redeploy — minutes. If brute-force is suspected meanwhile: rotate admin
credentials, review auth events (M1 audit_log).

**Owner.** Engineering. **Blocking:** blocks nothing; resolves together with R-12.

## R-15 — Email delivery blindness: bounces recorded as success

**Risk.** Email truth ends at the Resend API: there is no webhook receiver (no API routes exist), so
an accepted-but-bounced certificate email still stamps `emailed_at` and writes "Certificate emailed"
history (`src/app/(dashboard)/admin/certificates/actions.ts:119-134`; ops-testing audit). The OTP
email is a **hard dependency** — a candidate whose verification code bounces cannot proceed at all,
and `resendInvite` failures are fully silent (void action, no log, no admin feedback). Admins
currently believe candidates received things they never got. **Likelihood M** (bounces are routine;
4/9 certificates emailed to date — verified 2026-08-01) · **Impact M** (stuck candidates, false
admin records; per-candidate H, business-level M at current volume).

**Detection.** M1: `email_events` table fed by a Resend webhook (A-05) gives delivery/bounce truth;
bounce-rate alert + failed-email ops tile; the M0 "no fake success" pass surfaces send failures in
the admin UI (05-production-safety-plan.md).

**Mitigation.** M1 jobs pipeline adds retries with backoff; `emailed_at` semantics upgraded to
delivery-confirmed; admin surfaces show real per-message state.

**Recovery.** Resend from the admin UI once the failure is visible; contact the candidate through
another channel; Resend's dashboard holds the interim delivery log (unqueried today).

**Owner.** Engineering. **Blocking:** blocks nothing.

## R-16 — Entitlement cutover breaks existing token links

**Risk.** At the end of M1/M2, course-access checks flip from assignment-implicit to
entitlement-authoritative ([06-migration-strategy.md](06-migration-strategy.md)). If the backfill
misses any of the 20 live assignments — or the gating helper mishandles a legacy shape — existing
candidates' permanent token links (the only access they have; emailed and bookmarked) start
refusing, including candidates mid-preparation for an exam. **Likelihood M** (cutovers of
authoritative checks are where regressions live) · **Impact M** (locked-out candidates; small
population, fast fix, but trust-damaging).

**Detection.** Pre-cutover: a shadow period where the new entitlement check runs in log-only mode
and every would-be denial is recorded and reviewed (05-production-safety-plan.md). Post-cutover:
smoke test exercises a real token link; synthetic candidate-flow check; support channel.

**Mitigation.** Backfill entitlements for all 20 assignments (instant at this size — verified in
prod 2026-08-01), verify counts, run the shadow window until would-be denials are zero, then flip
behind an M1 feature flag.

**Recovery.** Flip the flag back to the legacy check (designed-in rollback), fix the backfill,
re-run the shadow window.

**Owner.** Engineering. **Blocking:** blocks the gating-cutover step itself (an M1-exit/M2 item);
nothing else waits on it.

## R-17 — Jobs/outbox pipeline stalls after M1 adoption

**Risk.** M1 moves certificate asset generation and all email sends onto the Postgres outbox drained
by Vercel Cron (A-05). The pipeline then becomes a single point of failure it never was before: a
cron misfire, a drainer bug, or a poison job can silently stall **all** email and asset delivery —
recreating R-01 one layer up if unwatched. **Likelihood M** (new infrastructure, first cron in the
project) · **Impact M** (delayed certificates and emails; visible and recoverable if alerting
works).

**Detection.** Designed in from day one (05-production-safety-plan.md): jobs heartbeat in the
`/api/health` deep check, alert on queue age and on dead-letter count, failed-jobs ops tile on the
admin dashboard (capability matrix, roles-admin: "Admin dashboard metrics").

**Mitigation.** Explicit job states (queued/running/succeeded/failed/dead) + attempts + last_error;
idempotent job design; on-demand drain trigger after enqueue so cron is a sweeper, not the sole
mover (A-05).

**Recovery.** Manual drain trigger; requeue dead jobs after the fix; because jobs are idempotent,
double-processing is safe by construction.

**Owner.** Engineering. **Blocking:** blocks nothing — detection ships inside M1 with the feature.

## R-18 — GDPR erasure request arrives before the anonymization primitive

**Risk.** A participant invokes Art. 17 erasure before M1 delivers the anonymization action. Hard
delete is impossible by design — the append-only `account_history` trigger aborts the FK cascade —
and the only known workaround is disabling the trigger in the production SQL editor (documented
operational practice; database audit), which is itself risk R-05 in action, performed under a
statutory 30-day deadline. There are 17 real data subjects today (verified 2026-08-01).
**Likelihood M** (it has effectively happened before — deletes were forced via the workaround) ·
**Impact M** (compliance exposure + untracked prod intervention).

**Detection.** Process, not telemetry: requests arrive via email/support. The M0 drift check
(R-05) at least detects the trigger-disable side effect if the workaround recurs.

**Mitigation.** Pull the anonymization primitive into M1 (registered challenge, capability matrix:
scrub participant PII, null email, scrub history event_data, set anonymized_at, keep certificate
rows); until then, an interim runbook: anonymize by manual UPDATE (scrub, don't delete) — satisfies
erasure without touching the trigger. Policy parameters follow D-12.

**Recovery.** If the trigger-disable workaround is used again: re-enable immediately, record the
intervention in audit_log, verify via the drift check.

**Owner.** Joint (engineering builds; client operates the process). **Blocking:** blocks nothing.

## R-19 — Attempt-finalization races corrupt result data

**Risk.** `recordAttempt` performs 5+ sequential unchecked writes: a double-submit duplicates
`attempt_answers` and history rows (the 0-row guarded update result is never checked), the fail path
can overwrite a `passed` assignment (missing `.neq('passed')` guard — `src/lib/certification/data.ts:353-413`),
and no DB constraint prevents two open attempts per assignment (database audit). Prod invariants are
currently clean (0 double-open, 0 passed-without-passed_at — verified 2026-08-01), reflecting low
concurrency, not safety. **Likelihood L** (17 participants; needs double-click/retry timing) ·
**Impact M** (duplicated answer data; in the worst interleaving, a pass overwritten by a fail —
a credential-integrity event, capped only by its rarity).

**Detection.** Reconciliation invariant sweep (double-open attempts, passed-without-cert,
status/timestamp mismatches — the same checks this audit ran, scheduled) + Sentry once write
results are checked and logged (05-production-safety-plan.md).

**Mitigation.** M0 (A-08): partial unique index on open attempts, post-submit immutability trigger,
fail-path `.neq('passed')` guard, row-count checks on every guarded update.

**Recovery.** Repair from ground truth: `attempt_answers` + append-only history allow re-grading via
the pure scoring module (`src/lib/certification/scoring.ts`) and correcting assignment status; the
snapshot architecture means issued certificates are unaffected by later corruption.

**Owner.** Engineering. **Blocking:** blocks nothing — scheduled M0 DB-guard work.

## R-20 — SVG sanitizer bypass reaches immutable snapshots

**Risk.** The certificate-template sanitizer is a regex denylist, not a parser-based allowlist
(`src/lib/certificate/template-import.ts:74-119`) — classically bypassable with malformed markup.
Today it is defused at render time: every browser surface shows snapshots via `<img>` data-URI
isolation (`src/components/certificate/certificate-view.tsx`) and server rendering goes through
resvg, which executes nothing. The residual risks: a bypassed payload is frozen **forever** into the
immutable `certificate_public_snapshot`, and admin-supplied XML feeds a native library server-side
(parser-bug exposure). Writers are the 3 trusted admins. **Likelihood L** · **Impact M** (persistent
payload awaiting any future rendering-path mistake; native-parser crash at worst).

**Detection.** CSP violation reports (M0 headers) would catch any rendering-path regression;
Sentry captures resvg crashes; the existing sanitizer test matrix guards known vectors.

**Mitigation.** M0: encode the `<img>`/resvg isolation rule as a tested invariant (a regression test
that snapshots are never rendered inline) + CSP as backstop. Post-launch nice-to-have, not a
blocker: parser-based sanitizer (auth-security audit's assessment — isolation is the load-bearing
layer).

**Recovery.** Deactivate the offending template, re-issue affected certificates via the R-02 path
(new snapshot from a clean template), review who uploaded it (M1 audit_log).

**Owner.** Engineering. **Blocking:** blocks nothing.

---

## Reading the register against the plan

Three patterns worth naming. First, **every High-impact risk except R-06 and R-09 is live today**,
before any academy work begins — the register is dominated by the current system's silent-failure
architecture, not by the new build; that is why M0 precedes everything and why its exit criteria
(observability, tracked migrations, env audit, backup drill, XSS/race/issuance fixes) directly
retire or de-fang R-01…R-05, R-08, R-10, R-11, R-13, R-14, R-19 and R-20. Second, the two risks
introduced by new work (R-06 Stripe, R-09 claim flow) both have their mitigations designed into the
respective milestone as ordering rules, not optional hardening. Third, the only risks engineering
cannot retire alone are R-07 (bus factor), R-12 (account access) and R-18's process half — all
jointly owned with the client, and all cheap to close. Detection mechanisms named here are specified
in full in [05-production-safety-plan.md](05-production-safety-plan.md); milestone acceptance
criteria that encode the mitigations live in [07-milestone-backlog.md](07-milestone-backlog.md).

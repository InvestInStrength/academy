# Final implementation recommendation

2026-08-01 · Conclusion of the academy scope package. Grounded in the full audit
([00](00-executive-assessment.md)), the 112-row capability matrix
([01](01-capability-matrix.md)), and verified production state. Decision IDs (D-xx) refer to
[08-decision-register.md](08-decision-register.md).

---

## 1. Recommended first release

**First release boundary = M0 + M1 + one commercial-or-learning milestone (M2 or M3, per D-01).**

- **M0 — Production truth & stabilization.** Not a feature release: fixes live defects
  (stored XSS on candidate pages, attempt-finalization races, the certificate-issuance
  dead-end, revoked-asset exposure per D-04) and ends operational blindness (Sentry +
  logging + error boundaries, `/api/health`, CI before deploy, tracked migrations, backup
  verification, production env audit — the Upstash question). Ship as several small deploys;
  no maintenance window needed.
- **M1 — Identity & access foundation.** Participant accounts (Supabase Auth, additive,
  claim-by-verified-email for the 17 existing participants), enrollments + entitlements with
  explicit state machines, manual payments recorded as real orders, signed expiring
  invitations, the jobs/outbox table + Resend `email_events`, generalized `audit_log`, and
  admin list search/pagination. After M1 the academy can already onboard paying customers
  **via manual payment** — revenue does not wait for Stripe.
- **Then D-01:** M2 (Stripe checkout — smaller, unblocks self-serve revenue) or M3 (learning
  MVP — modules/lessons/progress/dashboards). Engineering default: **M2 first**; both sit
  independently on M1 and the client's go-to-market should decide.

## 2. Recommended later releases

M4 (assessment upgrades: question pools, topic-balanced randomization, cooldowns, attempt
invalidation, admin attempt viewer — the viewer + invalidation are pull-forward candidates if
support burden appears earlier), M5 (credential portal, certificate replacement/lineage,
social formats — blocked on client designs, LinkedIn metadata), M6 (cohorts if D-03 confirms,
instructor/support roles, exports, GDPR workflows, analytics dashboards, impersonation).
Details and acceptance criteria: [07-milestone-backlog.md](07-milestone-backlog.md).

## 3. Features to exclude or replace (do not build)

- **Multi-tenant / white-label platform** — no foundation exists; single academy (A-01).
- **Full email-template editor UI** — replace with code-owned templates + editable copy
  blocks; 19 WYSIWYG templates are disproportionate for a 3-admin team.
- **Academy-side coupon engine** — Stripe promotion codes cover v1.
- **Full course-version migration engine** (draft trees, participant-migration tooling) —
  publish/archive + version-pin-at-enrollment covers the actual need; content-locking already
  protects assessment integrity.
- **Video watch-% enforcement as anti-cheat / DRM** — completion heartbeat with a
  configurable threshold; watch-through is a compliance signal, not competence proof.
- **Automatic audio extraction & background-playback engineering** — optional audio file per
  lesson if the curriculum supplies one.
- **Advanced question types** (scenario branching, hotspot, file/video submission) — revisit
  only with concrete curriculum demand.
- **In-app support inbox v1** — support reference IDs + email first (D-10).
- **CSV participant import** — 17 participants; manual enrollment suffices until cohorts.
- **Certificate expiry** — locked product decision: certificates do not expire.
- **Question discrimination statistics, share analytics beyond a verify-page view counter** —
  post-launch analytics at best.

## 4. Foundations to repair first (before any feature work)

In order, all inside M0:

1. **Migration tooling** — adopt Supabase CLI tracked migrations + a prod drift check before
   the next schema change; hand-pasted SQL is how silent divergence happens.
2. **Stored XSS** — escape `t()` parameters / drop `dangerouslySetInnerHTML` on the two
   candidate pages (`src/app/certification/[accessToken]/page.tsx:56`, `result/page.tsx:92`).
3. **Attempt/assignment integrity at the DB** — partial unique index on open attempts,
   post-submit immutability trigger, fail-path `.neq('passed')` guard, row-count checks in
   `recordAttempt`.
4. **Certificate issuance recoverability** — log issue failures, add an admin re-issue
   action for passed-without-certificate assignments, and (M1) move asset generation off the
   candidate's submit request onto jobs.
5. **Observability + CI** — Sentry, logging at every catch site, `error.tsx`, `/api/health`,
   GitHub Actions (typecheck + lint + 171 existing tests) gating deploys.
6. **Production env audit** — confirm/set Upstash vars in the client's Vercel account;
   verify backup/PITR tier in Supabase and run one restore test.
7. **Docs truth pass** — CLAUDE.md/ROADMAP/README corrections (stale claims enumerated in
   the audit), so future work is planned against reality.

## 5. Required maintenance windows

Almost none — production data is tiny and every schema change is additive. Two planned
short windows (minutes, announced):

- **Entitlement gating cutover** (end of M1/M2): flip course-access checks from
  assignment-implicit to entitlement-authoritative; verify the 20 backfilled entitlements.
- **Certificate storage privatization** (M0/M1, per D-04): swap public bucket for private +
  signed URLs; old emailed asset links die by design — client comms needed.

Everything else deploys live. Full sequences: [06-migration-strategy.md](06-migration-strategy.md).

## 6. Safe implementation order (summary)

M0 (tooling → security fixes → DB guards → observability → CI → env/backup audit → docs) →
M1 (jobs+email_events → audit_log → accounts+claim → enrollments/entitlements backfill →
manual payments/invitations → admin list upgrades → gating cutover) → M2 or M3 per D-01 →
remaining milestones per [07-milestone-backlog.md](07-milestone-backlog.md). Nothing in
M0/M1 waits on any client decision; D-01..D-17 run in parallel with build.

## 7. Clear next action for the development team

**Start M0, task 1: adopt Supabase CLI migration tracking and verify prod schema parity**
(read-only diff against the live project — the audit already confirmed logical parity of
migrations 0001–0007), then **land the stored-XSS fix and the attempt-integrity migration in
the same week**, with Sentry wired before anything else changes. Meanwhile send the client
the decision register (08) — D-01 (sell-first vs teach-first), D-02 (video hosting), D-04
(revoked-asset handling) and D-07 (pricing) are the only ones that shape the release after
next, and none of them blocks starting tomorrow.

# Capability matrix — every requested feature vs. current reality

**112 feature rows.** Dispositions: launch 64 · post-launch 28 · simplify 10 · client-decision 5 · defer-low-value 3 · replace 2.

Generated from the domain-by-domain audit (2026-08-01). Columns: **Status** = today's code +
production; **Disposition** = scope-challenge outcome; **Milestone** = target per
[07-milestone-backlog.md](07-milestone-backlog.md); **Cx** = complexity (S/M/L/XL).
Evidence cites `file:line` in this repo or verified production observations.

Status legend: ✅ Implemented, reliable · 🟡 Implemented, incomplete · 🟠 Implemented, structurally weak · ⬜ Missing, foundation-ready · ⛔ Missing, blocked by prerequisites


## Roles, permissions & admin operations

### Participant role — account identity & self-management

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity L) |
| **Requested in** | (1) Role model — Participant (identity/permission aspects only) |
| **Covers** | account create (claim existing participant record via verified email) · account manage (profile, email, password, language preference) |
| **Evidence** | `auth-security.md: 'PARTICIPANT / CANDIDATE MODEL (no Supabase Auth)' — participants use 192-bit access tokens, zero auth accounts (supabase/migrations/0001_core_schema.sql:172-190)`; `auth-security.md: email OTP verification is reliable and hashed at rest (src/lib/certification/email-verification-core.ts:14-66; 0006_email_verification_codes.sql:13-33) — the verified-email claim path A-02 needs already exists`; `production-truth.md: 17 participants, 17/17 have email, 11 confirmed, 0 duplicates — claim-by-email backfill is trivial`; `database.md: participants.email has no uniqueness/format constraint (0001:54-62) — must be constrained before claim-by-email` |
| **Gap** | No Supabase Auth for participants, no participant-facing RLS policies (candidate flow is 100% service-role), no account pages of any kind. participants.email is unconstrained (uniqueness/normalization) which the claim flow depends on. |
| **Depends on** | A-02 participant auth decision (fixed); participants.email uniqueness/normalization migration; M1 enrollments/entitlements for the account dashboard to show anything |

Build exactly per A-02: additive nullable participants.auth_user_id → auth.users, claim flow reusing the existing OTP-verified email, token surface stays for exam access, account becomes the durable home. Add a unique partial index on lower(email) first (prod has 0 duplicates, backfill instant). Contact-support, personal-data export and deletion-request bullets are carried by the Support and GDPR rows; learning/assessment/certificate/commerce capabilities of this role belong to those domains — cross-reference, do not duplicate.

### Academy administrator role — capability envelope & capability map

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M1** (complexity S) |
| **Requested in** | (1) Role model — Academy administrator (full capability list) |
| **Covers** | create courses/versions · publish/archive courses · build modules+lessons+quizzes+exams · configure progression/access rules · configure prices · configure invitations · configure coupons · manage participants · manage enrollments/entitlements · manage cohorts · manage instructors · grant manual access · record manual payments · review progress/attempts/exact answers · manually pass participants · invalidate attempts · issue/revoke/replace/regenerate certificates · manage certificate+social+email templates · review revenue/Stripe/refunds/disputes · manage support requests · export data · review audit logs · controlled impersonation (admin capability) · manage GDPR requests |
| **Evidence** | `auth-security.md: all 36 admin Server Actions across 9 action files call requireAdmin()/requireSuperadmin() as first statement (grep-verified; src/lib/auth/admin.ts:25-55), RLS mirrors the gate (0001:561-586)`; `auth-security.md least-privilege inventory: plain admin CAN do all content CRUD, participant CRUD, manual pass with synthetic 100% attempt, certificate revoke/reinstate/email, template CRUD, link regeneration`; `admin-surfaces.md 'EXPLICITLY NOT POSSIBLE TODAY': no revenue/pricing/refunds, no cohorts, no support inbox, no impersonation, no email-template editing, no exports, no attempt viewer, no bulk ops`; `Spot-check 2026-08-01: requireAdmin() confirmed unchanged (src/lib/auth/admin.ts:25-46)` |
| **Gap** | The role and its gating are solid, but roughly 60% of the target capability list has no feature behind it (prices, coupons, enrollments, cohorts, manual payments, revenue, support, exports, impersonation, GDPR). The role is monolithic: no capability map or namespaced action registry, so future instructor/support tiers would require touching every action. |
| **Depends on** | Feature rows in learning/commerce/certification domains deliver the actual capabilities on their own milestones |

Keep admin/superadmin binary for launch (A-11, do not challenge). In M1, formalize a code-level capability map (namespaced action registry, e.g. content.write, participants.write, certificates.revoke, finance.read) that requireAdmin() consults — cheap now, makes instructor/support tiers additive later and gives the generalized audit log its action vocabulary. Each listed capability is COSTED in its owning domain (learning, commerce, certification); this row owns only the permission envelope and attribution.

### Instructor/mentor role (assigned-courses-only tier)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity L) |
| **Requested in** | (1) Role model — Instructor/mentor |
| **Covers** | view assigned courses only · view assigned cohorts · review participant progress+results in assigned courses · internal notes on participants · communicate with participants (assigned scope) · limited cohort operations · explicitly blocked: financials · explicitly blocked: Stripe · explicitly blocked: global settings · explicitly blocked: GDPR · explicitly blocked: unassigned courses |
| **Evidence** | `database.md: admin_profiles.role text CHECK ('admin','superadmin') only (0001:42-48); is_admin()/is_superadmin() are the only predicates (0001:509-533)`; `auth-security.md 'Least-privilege roles beyond admin/superadmin — absent': new tiers need new role value, new RLS predicates (is_admin() is binary), per-action gates — none exist` |
| **Gap** | Entire role absent: no third role value, no course-scoping table, no scoped RLS predicates, no scoped admin chrome. Also nothing to scope onto yet — no progress data (M3), no cohorts (client decision), no participant messaging. |
| **Depends on** | M1 capability map + role-enum widening (design); instructor_courses assignment table; M3 progress surfaces (something to review); cohorts client decision D (row 'Cohort management') |
| **Risk of building now** | Building course-scoped RLS and a scoped UI variant of every admin surface now — with zero instructors, no cohorts and no progress data to view — multiplies the permission test matrix on every future feature while delivering nothing usable. |

Per A-11: DESIGN in M1 (widen the role CHECK, define instructor_courses table and RLS predicate shapes on paper, bake the capability map), BUILD in M6 only when cohorts/instructor headcount exist. Internal notes and progress review reuse the participant-detail sections built for admins, filtered by instructor_courses.

### Support administrator role

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (1) Role model — Support administrator |
| **Covers** | search participants · review access/enrollment/payment state · review email delivery · review support history · resend invitations · resend certificate emails · impersonation (support-scoped) · explicitly blocked: exam content · explicitly blocked: manual pass · explicitly blocked: revoke certificates · explicitly blocked: financial config · explicitly blocked: global rules |
| **Evidence** | `database.md: binary role CHECK (0001:42-48); auth-security.md: no read-only/support tier scaffolding exists`; `database.md 'absent': no email delivery log table (only certificates.emailed_at + history events) — nothing for a support role to review`; `admin-surfaces.md: resend-invite and send-certificate-email already exist as admin actions (participants/actions.ts:428-471; certificates/actions.ts:76-142) — the powers this role needs are built, only the restricted tier is not` |
| **Gap** | Role absent, and its two core review surfaces (email delivery truth, support history) have no data source until email_events (M1) and the support workflow (M6) exist. Every 'allowed' power already exists at admin level. |
| **Depends on** | M1 capability map; M1 email_events (delivery truth); M6 support workflow; impersonation row (if support gets it) |
| **Risk of building now** | A fourth role for a 3-person staff adds permission-matrix complexity and RLS surface with zero users; the resend powers it would grant are already available to admins. |

Build in M6 alongside the lightweight support workflow, as a capability-map subset (read participants + email_events + support_requests; execute resend actions only). With 3 staff users today the tier has no operational payoff; the brief's A-11 gating (build when support volume exists) stands.

### Admin account hardening & credential lifecycle (audit-derived)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | Audit-derived — not in client target scope; prerequisite for (1) role model integrity and (12) audit log non-repudiation |
| **Covers** | in-code active-admin check in requireAdmin (currently RLS-side-effect only) · last-superadmin count guard (mutual demotion race) · admin password reset / forgot-password flow · invite-based admin onboarding (replace superadmin-chosen plaintext password) · admin auth-event logging (login/logout/failed login) · MFA for admin accounts (optional, post-launch) |
| **Evidence** | `Spot-check 2026-08-01: src/lib/auth/admin.ts:35-43 selects the profile with no .eq('active', true) and never inspects profile.active — the comment at line 15 claims a check the code does not perform; a disabled admin is rejected only via the RLS select policy (0001:509-520,555-556)`; `auth-security.md: setAdminRole only blocks self-change — two superadmins can mutually demote, leaving zero superadmins (settings/admins/actions.ts:79-91)`; `auth-security.md: no resetPasswordForEmail, no auth.updateUser, no MFA anywhere; createAdmin sets a superadmin-known password with email_confirm:true (admins/actions.ts:38-42); admin-surfaces.md: password field is type="text" (admin-create-form.tsx:41-48)`; `auth-security.md: no admin login/logout/failed-login events exist anywhere (account_history is participant-scoped)` |
| **Gap** | The audit's attribution story (account_history.created_by_admin_id, future audit_events.actor) is only trustworthy if admins exclusively hold their own credentials — today the superadmin knows every password. Active-check and last-superadmin guards are one-line-defect-class fixes. No recovery path for a locked-out admin except Supabase dashboard surgery. |
| **Depends on** | Supabase Auth email (recovery) enabled project-side — currently unverifiable (production-truth open items); M1 generalized audit log for auth events |

M0 for the two code guards (active check in requireAdmin, last-superadmin count check — both trivial and defect-class). M1 for reset flow + invite-based onboarding (Supabase resetPasswordForEmail; new admin sets own password on first login) and auth events into the generalized audit log. MFA is post-launch secondary. This row is not in the client scope but the synthesizer must carry it: audit-log value (row 16) depends on it.

### Admin dashboard metrics (ops + business)

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | simplify → **M1** (complexity M) |
| **Requested in** | (2) Admin dashboard metrics |
| **Covers** | active participants · new enrollments · course starts · course completion · upcoming expirations · exam attempts · pass rate · failed attempts · certificates issued · generation failures · revenue · refunds · disputes · open support requests · failed emails · failed webhooks · failed jobs · system warnings |
| **Evidence** | `admin-surfaces.md: dashboard home has 5 real count tiles (courses, seminars, questions, questionnaires, participants) via count:exact head:true (src/app/(dashboard)/admin/page.tsx:37-56) — spot-checked, still count-exact queries`; `admin-surfaces.md: no certificate count, no activity feed, no pass-rate metrics; database.md 'absent': no jobs table, no email delivery log, no orders — 10 of the 18 target metrics have no data source today`; `production-truth.md: attempts 23, pass 9/fail 12 events, certificates 9 — assessment metrics are computable from existing tables immediately` |
| **Gap** | Only inventory counts exist. Assessment metrics (attempts, pass rate, failures, certificates issued) are computable today but unbuilt. Ops metrics (failed jobs/emails/webhooks, generation failures, system warnings) are impossible until A-05 jobs + email_events + A-10 observability exist; commerce metrics need M2; course starts/completion need M3; expirations need entitlements. |
| **Depends on** | A-05 jobs + email_events (M1) for ops tiles; M2 orders/payments/refunds/disputes for commerce tiles; M3 progress for course metrics; M1/M2 entitlements for expirations |

Phase it, ops-first (aligns with M0/M1 'make failure visible'): M1 ships assessment tiles (attempts, pass rate, failed attempts, certificates issued from existing data) + ops-health tiles (failed jobs, failed emails, certificate generation failures, dead-letter count) fed by the M1 jobs/email_events tables; M2 adds revenue/refunds/disputes/new-enrollments; M3 adds course starts/completion; expirations tile when entitlements carry expires_at. 'System warnings' = Sentry link-out + jobs dead count, not a bespoke alerting UI. Full analytics dashboards remain M6.

### Participant list: search, pagination, filters

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (3) Participant list filters |
| **Covers** | filter: course · filter: version · filter: cohort · filter: enrollment date · filter: access source · filter: payment type · filter: progress · filter: last activity · filter: assessment status · filter: certificate status · filter: expiration · filter: support status · free-text search (audit-derived necessity) · pagination (audit-derived necessity) |
| **Evidence** | `admin-surfaces.md: participant list shows name/email/created only — no search, no pagination, no status columns (participants/page.tsx:15-18); every admin list loads all rows unbounded, no .range()/.limit() anywhere`; `admin-surfaces.md: the ONLY list filter in the entire admin is questions-by-course (questions/page.tsx:44-50)`; `production-truth.md: 17 participants — usable today, degrades linearly with growth (audit weakness: finding a participant requires browser Ctrl-F)` |
| **Gap** | List exists but has zero filter/search/pagination infrastructure. Half the target filter dimensions reference entities that do not exist yet (cohort, access source, payment type, progress, expiration, support status). |
| **Depends on** | M1 enrollments/entitlements (access source, enrollment date, expiration dims); M2 payments (payment type dim); M3 progress (progress/last-activity dims); cohorts client decision (cohort dim) |

M1 per the brief ('admin list pagination/search/filters — unblocks everything'): build search + pagination + the filters whose dimensions exist (course via assignments, enrollment date, assessment status, certificate status; access source once enrollments land in the same milestone). Design the filter bar data-driven so entity-dependent dimensions (payment type M2, progress/last-activity M3, cohort/support status M6-or-client-decision) plug in without rework. Apply the same infra to certificates and questions lists while there.

### Participant detail page (360° view)

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (4) Participant detail page |
| **Covers** | profile · roles · enrollments · entitlements · orders · payments · progress · internal notes · quiz/exam attempts review · certificates · email events · support history · consent history · audit history · private lesson notes hidden unless shared |
| **Evidence** | `admin-surfaces.md: rich detail page exists — profile card with inline edit, assignments with invite/link/topics/manual-pass, certificate block with assets, append-only history feed with admin attribution (participants/[participantId]/ inventory)`; `admin-surfaces.md 'EXPLICITLY NOT POSSIBLE TODAY': no notes field on participants, no attempt-history viewer (attempts/scores never surfaced in admin UI — only status badges)`; `admin-surfaces.md weakness: detail page over-fetches every questionnaire/topic/course/admin profile per render ([participantId]/page.tsx:39-67)`; `database.md: enrollments/entitlements/orders/payments/progress/consent entities entirely absent from the 17-table schema` |
| **Gap** | Strong skeleton (profile, assignments, certificates, history) but 9 of 15 target sections have no backing entity, admins cannot see attempt details/exact answers (a listed academy-admin capability), and there is no internal-notes field. |
| **Depends on** | M1 enrollments/entitlements/email_events/audit_events; M2 orders/payments; M3 progress + lesson notes (learning domain); M6 consent/support sections |

Grow the existing page section-by-section as entities land: M1 adds enrollments/entitlements panel, internal notes (participant_notes), email-events feed, generalized audit feed, and fixes the over-fetching; PULL FORWARD the admin attempt viewer (read-only attempts + attempt_answers with exact answers) from M4 into M1/M2 — the brief explicitly allows it, data already exists, and it is a named admin capability with zero schema cost. Orders/payments panel M2; progress panel M3; consent history M6 (or with M2 checkout consent capture). 'Private lesson notes hidden unless shared' is a learning-domain rule (participant-owned notes) — flag to that domain, enforce visibility flag in its schema.

### Cohort management

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | client-decision → **client-decision** (complexity L) |
| **Requested in** | (5) Cohort management |
| **Covers** | create cohort · assign course version · cohort dates · assign instructor · add/import participants · announcements · content releases · deadlines · performance review · export cohort results |
| **Evidence** | `admin-surfaces.md: 'no cohorts/groups/classes' (verified absent in code); database.md: cohorts absent from schema`; `production-truth.md: 2 courses (1 course + 1 seminar), 17 participants — no cohort-shaped delivery exists in the business today` |
| **Gap** | Entirely absent, and its prerequisites are staged: enrollments (M1) to hang membership on, jobs/email (M1) for announcements, lesson release rules (M3) for cohort releases, instructor role (M6) for assignment. |
| **Depends on** | M1 enrollments (nullable cohort_id ready); M1 jobs/email_events (announcements); M3 lesson release rules (cohort releases); M6 instructor role (instructor assignment); M6 exports (results export) |
| **Risk of building now** | Building scheduling/announcement/deadline machinery ahead of a confirmed cohort teaching model is speculative product work; with 17 participants and no cohort-style delivery today it would be dead UI plus untested permission surface. |

Standing disposition stands: client decision. Keep the schema ready at zero cost — enrollments.cohort_id uuid NULL from day one (M1) — and build the cohorts table + UI only on client confirmation (earliest M6). If confirmed, announcements ride the jobs/email pipeline and 'export results' reuses the M6 export infra; do not build a parallel messaging system.

### Manual enrollment (admin grant with audit)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (6) Manual enrollment |
| **Covers** | select participant · select course · select version · optional cohort · access duration · required reason · payment classification · responsible admin recorded · audit record |
| **Evidence** | `admin-surfaces.md: today's analog exists and works — createAssignment with duplicate-active guard, invite email, assignment_created history event (participants/actions.ts:233-355); manualPass requires ≥3-char reason and logs manual_pass with reason + admin (actions.ts:473-535)`; `database.md: enrollments/entitlements/orders tables absent — the target's enrollment record has nowhere to live yet`; `production-truth.md: account_history reliably captures admin attribution today (146 rows, created_by_admin_id pattern proven)` |
| **Gap** | Grant-access-by-admin exists only at exam-ticket granularity (assignment). No duration/expiry, no payment classification, no enrollment record. The UX pattern (create form + confirm + history event) and the audit plumbing are proven and directly reusable. |
| **Depends on** | M1 enrollments + entitlements tables (identity domain); M1 orders with method='manual' (commerce domain); M1 generalized audit log |

Build in M1 as the admin UI of A-03/A-04: form = participant + course (version pinned at enrollment per A-06) + optional cohort_id (dormant) + duration → entitlements.expires_at + required reason + payment classification (creates an orders row with method='manual' per A-04 — manual payments are real orders) + auto-stamped responsible admin + audit_events record. This is the bridge that lets the business sell manually before/without M2 Stripe.

### CSV import (participants + enrollments)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | defer-low-value → **M6** (complexity M) |
| **Requested in** | (7) CSV import |
| **Covers** | column: name · column: email · column: course · column: cohort · column: payment status · column: expiration · column: external ref · safeguard: preview · safeguard: validation · safeguard: duplicate detection · safeguard: error report · safeguard: batch ID · safeguard: reversible action · safeguard: audit event |
| **Evidence** | `admin-surfaces.md: no CSV/XLSX import or export on any surface (verified absent)`; `production-truth.md: 17 participants total — there is no bulk-onboarding pressure`; `database.md: participants.email unconstrained (duplicate detection has no DB backstop); enrollments/cohorts/payment-status columns to import into do not exist` |
| **Gap** | Fully absent, and most target columns (course/cohort/payment status/expiration) map to M1/M2 entities that do not exist yet. Duplicate detection needs the email uniqueness constraint from the participant-accounts row. |
| **Depends on** | M1 enrollments/entitlements (import targets); participants.email uniqueness (duplicate detection); M6 exports/audit infra (error report, audit event) |
| **Risk of building now** | Batch machinery (preview/rollback/batch IDs) for a 17-participant academy is pure overhead and would hard-code column assumptions about enrollments before M1 shapes them — guaranteed rework. |

Standing disposition stands: defer. Manual enrollment (M1) covers onboarding at current volume. When built (M6 at earliest, or on a concrete bulk-onboarding trigger like a seminar cohort purchase), use the import_batches design in the data model: preview-then-commit, per-row error report, batch_id stamped on created rows for one-click revert, one audit event per batch.

### Reporting & data exports

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (8) Reporting/exports |
| **Covers** | export: participants · export: enrollments · export: entitlements · export: progress · export: attempts · export: certificates · export: orders · export: payments · export: revenue · export: coupons · export: invitations · export: manual payments · export: support requests · export: audit events |
| **Evidence** | `admin-surfaces.md: no CSV import or export on any surface (verified absent)`; `database.md: participants/attempts/certificates/account_history data exists and is cleanly queryable (explicit schema, snapshots); 8 of 14 export subjects have no table yet` |
| **Gap** | Zero export capability. Subjects split cleanly: exportable-today data (participants, attempts, certificates, audit events) vs entities arriving M1 (enrollments, entitlements, invitations, manual payments), M2 (orders, payments, revenue, coupons), M3 (progress), M6 (support). |
| **Depends on** | M1 list filter infrastructure (query reuse); M1/M2 entities for their subjects; M1 audit log (export events are auditable actions) |
| **Risk of building now** | A generic export framework now would speculate about the shape of 8 not-yet-designed tables; per-list buttons later are cheaper than a framework today. |

M6 per the brief, with a simplify secondary: implement as filter-aware CSV download buttons on each admin list (reuses the M1 filter/search infra — build that infra with an exportable query layer in mind), each export writing a 'data.exported' audit event (a named minimum audit event). Revenue/coupon reporting defers to the Stripe dashboard v1 (A-04). Participants/certificates/attempts exports are cheap pull-forwards if the client asks.

### Support workflow (participant contact + admin inbox)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | simplify → **M6** (complexity M) |
| **Requested in** | (9) Support inbox + (1) Participant 'contact support' |
| **Covers** | participant-side contact-support entry point · ticket links to participant · ticket links to course · ticket links to order · ticket links to payment · ticket links to attempt · ticket links to certificate · status: new · status: in-progress · status: waiting · status: resolved · status: closed |
| **Evidence** | `admin-surfaces.md: 'no messaging or support inbox' — no candidate communication beyond invite/cert emails (verified absent)`; `production-truth.md: 17 participants, 3 staff — support volume is near zero` |
| **Gap** | No support surface on either side. A v1 (support email + reference codes) needs no schema; the specced linked-ticket inbox needs a new entity plus polymorphic links to objects that partly do not exist yet (orders, payments). |
| **Depends on** | M1 participant accounts (contact surface); M1 email_events (reply visibility); M2 orders/payments (ticket links to them) |
| **Risk of building now** | Building a CRM-grade inbox for near-zero ticket volume is the textbook premature feature; an external tool likely beats in-house here permanently. |

Standing disposition stands: v1 = a support mailto/form on candidate+account surfaces stamped with a human reference code (participant short-id + assignment context), plus a minimal support_requests log table (status enum exactly as specced) so history accrues from day one; the full linked-ticket inbox (or an external helpdesk tool — cheaper) only if volume proves need in M6. Participant 'contact support' entry point can ship with M1 accounts at trivial cost.

### Controlled impersonation

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (10) Controlled impersonation |
| **Covers** | explicit reason required · visible banner · read-only default · sensitive actions blocked · start/end logged · attribution of impersonated actions · no hidden impersonation · short session lifetime |
| **Evidence** | `auth-security.md ABSENT list: 'impersonation feature (de facto possible: candidate flow is unauthenticated, any admin can open any access link indistinguishably)'`; `admin-surfaces.md: admins can only copy the raw candidate link (copy-link-button.tsx:8-27); link copies are NOT audit-logged (regeneration is: access_link_regenerated event)` |
| **Gap** | No formal impersonation, and — worse for the 'no hidden impersonation' requirement — an invisible equivalent exists today: any admin can browse any candidate surface via the access token with zero logging and no way to distinguish admin from candidate traffic. There is no participant session to impersonate until M1 accounts exist. |
| **Depends on** | M1 participant accounts (a session to impersonate); M1 generalized audit log + capability map (blocklist, attribution) |
| **Risk of building now** | Nothing account-shaped exists to impersonate; formalizing impersonation of the token surface would legitimize exactly the unaudited pattern the requirement forbids. |

Per A-11: build in M6 after participant accounts — impersonation_sessions table (required reason, read-only mode default, short expires_at), banner, sensitive-action blocklist from the capability map, start/end + every impersonated action stamped with impersonation_session_id in audit_events. Interim M1 mitigation for the hidden-impersonation gap: write an audit event when an admin opens/copies a candidate link from the admin UI (one-line addition to the existing copy/regenerate surface).

### GDPR & privacy program

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | post-launch → **M6** (complexity L) |
| **Requested in** | (11) GDPR & privacy + (1) Participant 'export personal data' and 'request account deletion' |
| **Covers** | participant self-service personal-data export · participant data correction · participant deletion request · admin-side consent records · terms-version history · retention rules · deletion workflow · legal hold · certificate/transaction retention rules · anonymization where deletion incompatible |
| **Evidence** | `admin-surfaces.md weakness: participant hard-delete can NEVER succeed once history exists — account_history.participant_id ON DELETE CASCADE collides with the append-only trigger, aborting the whole delete (participants/actions.ts:196-211; 0001:281; 0001:502-504)`; `database.md: documented operational workaround is disabling the safety trigger in the prod SQL editor (corroborated by project memory) — untracked prod drift risk`; `database.md ABSENT: no consent records, no terms versions, no retention/anonymization fields anywhere in the 17-table schema`; `production-truth.md open item: whether the append-only trigger is currently enabled in prod is unverified` |
| **Gap** | The only existing primitive (delete) is broken by design collision; erasure today requires disabling a safety trigger in production SQL. No export, no consent capture, no retention policy, no anonymization path. Certificates/attempt snapshots embed participant names — deletion is genuinely incompatible with credential integrity, so anonymization is the required design, and it does not exist. |
| **Depends on** | M1 participant accounts (self-service surfaces); M1 audit log (deletion/export events are minimum audit events); M2 checkout (consent capture point, transaction retention); professional review: retention policy + certificate legal wording |
| **Risk of building now** | Building full consent/retention/legal-hold machinery before commerce exists risks rework (commerce creates most retention questions); but deferring the anonymization primitive keeps a live legal gap and a dangerous prod-SQL practice — hence the M1 pull-forward challenge. |

Program lands M6 per the brief, with professional-review secondary (retention periods, certificate/financial-record retention, anonymization adequacy — already in the brief's register). EXPLICIT CHALLENGE, evidence-backed: pull the anonymization primitive into M1 — GDPR erasure obligations are live now with 17 real data subjects, the current SQL-editor-with-trigger-disabled workaround is precisely the untracked-drift risk M0 exists to kill, and the primitive is small (anonymize action: scrub participants PII, null email, scrub account_history event_data, mark anonymized_at; keep certificate rows). Consent capture starts at M1 account claim + M2 checkout (terms version on consent_records), not retroactively.

### Generalized audit log

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (12) Audit log minimum events |
| **Covers** | role changes · manual enrollments/payments · access grants/revocations/extensions · manual passes · attempt invalidations · certificate issue/revoke/replace · refund actions · impersonation start/end · course publication · version changes · exam config changes · data export/deletion · admin config changes |
| **Evidence** | `database.md: account_history is genuinely append-only (trigger fires even for service-role, 0001:493-504) with admin attribution (created_by_admin_id) — the hard part is proven`; `production-truth.md: 11 event types live in prod, 146 rows, healthy coverage of the participant/certificate lifecycle`; `admin-surfaces.md: NOT logged today — participant profile edits, assignment topic edits, asset regeneration; no global audit view (participant-page feed only)`; `auth-security.md: no admin login/logout/failure events; database.md: event_type is unconstrained free text (vocabulary lives in a comment); event_label frozen in write-time language (i18n gap)` |
| **Gap** | Excellent participant-scoped foundation, but the target needs actor/object-scoped coverage: admin/config/content events (role changes, course publication, exam config, exports) have no home — account_history requires a participant_id NN. No global viewer, free-text event vocabulary, and the CASCADE-vs-trigger delete collision must not be replicated. |
| **Depends on** | M1 capability map (action vocabulary); later-milestone features emit their own events (M2 refunds, M4 invalidations, M6 impersonation/exports) |

M1 per the brief: new audit_events table (see data model) with the same append-only trigger pattern, namespaced action registry shared with the capability map (row 2), participant_id nullable + ON DELETE SET NULL (fixes the collision class), impersonation_session_id column reserved. Keep account_history as the candidate-lifecycle timeline (rename conceptually, stop adding admin-ops events to it); participant detail page renders both feeds merged. Wire the currently-unlogged mutations (profile edits, topic edits, asset regen) and admin auth events immediately; later categories (refunds, invalidations, publication, impersonation) land with their features but MUST write events from day one — make audit emission part of each milestone's definition of done.

### Email templates & copy editing

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | replace → **M6** (complexity M) |
| **Requested in** | (13) Email template editor — 19 templates + variables |
| **Covers** | template: welcome · template: purchase confirmation · template: private invitation · template: manual access granted · template: course access granted · template: module released · template: inactivity reminder · template: access expiring · template: access expired · template: quiz result · template: exam passed · template: exam failed · template: certificate issued · template: certificate delayed · template: certificate revoked · template: certificate replaced · template: payment failed · template: refund processed · template: support reply · variables: name, course, cohort, expiration, certificate URL, support URL, score, revision area |
| **Evidence** | `admin-surfaces.md: email bodies are code-built with no admin editor (src/lib/email/invite-email.ts:32-37); existing sends: invite, certificate, OTP verification — 3 of the 19 target templates have any counterpart`; `auth-security.md: Resend is send-only, no webhook receiver — no delivery truth (emailed_at ≠ delivered, production-truth.md)`; `auth-security.md weakness: i18n t() does raw {param} substitution with zero escaping (src/lib/i18n/dict.ts:33-35) — the stored-XSS bug class directly constrains any admin-editable copy interpolation` |
| **Gap** | 3 of 19 templates exist (invite ≈ private invitation, certificate issued, OTP). No editor, no editable copy, no delivery/bounce visibility, sends are fire-and-forget (silent failure on resendInvite). Most missing templates depend on features from M1–M5. |
| **Depends on** | M1 jobs/outbox + email_events + Resend webhook (A-05); feature milestones that trigger each template; M0 escaping fix pattern for interpolation |

Standing disposition stands: NO WYSIWYG template editor — code-owned layout/rendering + DB-stored editable copy blocks (email_copy_blocks keyed by template_key × locale × block_key), edited via a plain admin form in M6. Variables interpolate through an HTML-ESCAPING substitute (do not reuse t()'s raw substitution — same bug class as the M0 stored-XSS fix). Templates accrue with their features on the jobs/outbox pipeline (A-05, retry + email_events): M1 welcome/claim + manual-access-granted + invitation refresh; M2 purchase confirmation, payment failed, refund processed, access expiring/expired; M3 course access granted, module released, inactivity reminder, quiz result; M4 exam passed/failed; M5 certificate delayed/revoked/replaced; M6 support reply. Certificate issued exists — move it onto jobs in M1.


## Learning platform

### Participant dashboard (cross-course account home)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity L) |
| **Requested in** | (1) |
| **Covers** | continue learning entry point · course cards · progress % per course · current module indicator · next action · access-expiration date · cohort deadlines widget · certification status · saved resources widget · notes widget · notifications · recent lessons · certificates list |
| **Evidence** | `src/app/certification/[accessToken]/page.tsx:47-116 — the only participant-facing surface today is a per-assignment token hub (title, latest score, start/retake CTA); no account, no cross-course view`; `production-truth.md: participants 17, courses 2, zero participant auth users — no accounts or enrollments exist in live data` |
| **Gap** | No participant identity and no cross-course surface exist; participants only ever see one tokenized exam hub per assignment. |
| **Depends on** | participant accounts + claim flow (A-02, M1); enrollments + entitlements (A-03, M1); modules/lessons + lesson_progress (M3, this domain); jobs/email_events (A-05, M1) for notifications |

Build in M3 as the account home per A-02: course cards with progress %, current module, resume/next-action link, certification status, access-expiry date (from entitlement), and a certificates list (link into the M5 credential portal for detail). Defer the cohort-deadlines, saved-resources, notes, and in-app notifications widgets post-launch; launch-time notifications are email-only via the M1 jobs/outbox (A-05). Recent-lessons = derived from lesson_progress, cheap to include.

### Course dashboard (per-enrollment course home)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity M) |
| **Requested in** | (2) |
| **Covers** | course introduction · instructor info · course progress · module list · required actions · course resources · exam eligibility/status · access expiration display · certificate status · cohort info |
| **Evidence** | `src/app/(dashboard)/admin/courses/content-list-page.tsx / content-detail-page.tsx — 'course' today is an admin-only object holding topics and questions; no participant rendering exists`; `docs-truth.md: grep for LMS/learning-content across all repo md/ts/tsx/sql — zero matches` |
| **Gap** | Courses have no participant-facing page at all; introduction/instructor/module data has no home in the schema. |
| **Depends on** | enrollments + entitlements (M1); course content model (this domain, M3); existing assignment chain for exam status (implemented) |

M3: module list with lock/release state, progress bar, intro + instructor text from course_versions, attached resources, entitlement expiry, and exam eligibility computed as (all required modules complete AND active entitlement). In M3 surface eligibility as status only — certification_assignment creation stays admin-manual as today; auto-creating the assignment on eligibility is a post-launch cross-domain feature with the assessment domain. Cohort info panel only if cohorts are confirmed (client decision).

### Course content structure (course → version → module → lesson hierarchy)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M3** (complexity L) |
| **Requested in** | (3) — entity skeleton; media kinds live in the lesson-types row, 'course version' in the versioning row, 'subtopic' in the modules row |
| **Covers** | course as program root · module entity · lesson entity · module assessment (quiz lesson → questionnaire) · final exam (course_version → existing questionnaire/assignment chain) |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:67-74 + 0007_seminars.sql:25-43 — courses exists as the program root with kind, active, localized titles; A-06 fixes it as the anchor`; `database.md 'Target-LMS entities — absent': modules, lessons, progress tracking fully absent from the 17-table schema`; `src/lib/certification/data.ts + scoring.ts — the final-exam machinery (questionnaire→assignment→attempt→certificate) already exists and is reliable` |
| **Gap** | The entire hierarchy below 'course' is greenfield; only the exam end of the chain exists. |
| **Depends on** | enrollments (M1) before progress attaches; assessment-domain decision on practice-vs-exam semantics for quiz lessons (M4 pull-forward or M3 ungraded) |

Purely additive schema per A-06: course_versions (learning-content container) → modules → lessons; final exam = course_versions.final_exam_questionnaire_id pointing at the existing questionnaire chain (assignment/attempt/certificate machinery untouched); module assessment = quiz-type lesson referencing a questionnaire. CRITICAL cross-domain rule: quiz lessons must NOT create certification_assignments (any assignment locks content and can issue certificates) — they need practice semantics from M4, or ship M3 quizzes as ungraded inline self-checks (see notes). Backfill = insert one published course_version per existing course row (2 rows, instant).

### Course versioning (publish/archive + enrollment version pin)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | simplify → **M3** (complexity M) |
| **Requested in** | (4) + '(3) course version' |
| **Covers** | no silent overwrites of published versions · preserve exact curriculum tied to enrollment/progress/attempts/thresholds/question sets/cert issuance+wording+status · draft/published/archived states · participant migration rules · existing-participant vs new-enrollment behavior · assessment + certificate compatibility |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:383-489 — content-lock trigger family already freezes questionnaires/questions once assigned (the exact guard pattern to reuse for published versions)`; `database.md: attempts snapshot displayed content (attempt_snapshot, question_snapshot) and certificate_public_snapshot freezes cert wording — assessment/certificate compatibility is already solved by D3 + snapshots` |
| **Gap** | No version entity exists; but the freeze/snapshot machinery the target requires is proven in production for the assessment side. |
| **Depends on** | enrollments (M1) carry the course_version_id pin column |
| **Risk of building now** | A full version tree + participant-migration engine is multi-week work solving a problem a 2-course, 17-participant academy does not have; the simplified pin covers every integrity requirement in the scope. |

Confirm the standing challenge: v1 = draft/published/archived status on course_versions, a guard trigger (mirroring guard_questionnaires_update) freezing structural content of a published version once enrollments exist, edit = duplicate to new draft (extends locked decision D3), and enrollments.course_version_id pinned at enrollment. Existing participants stay on their pinned version; new enrollments get the latest published (partial unique index: one published version per course). NO migration tooling in v1 — with 17 participants an admin can manually repoint enrollment.course_version_id; attempts/thresholds/question sets/cert wording are already frozen by the existing lock+snapshot chain.

### Module flags, ordered progression, subtopics

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M3** (complexity S) |
| **Requested in** | (5) minus release bullets (→ drip row) + '(3) subtopic' |
| **Covers** | required/optional module status · hidden module status · locked module status · ordered progression · subtopics for large modules |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:79-88 — course_topics establishes the sort_order + active + per-course child pattern to copy`; `admin-surfaces.md: numeric sort_order + up/down reorder is the established admin ordering convention` |
| **Gap** | No module entity; flags and ordering are simple columns once modules exist. |
| **Depends on** | modules schema (this domain, M3) |

M3: modules carry required (bool), visibility ('visible'|'hidden'), sort_order; 'locked' is a derived display state from progression/release rules, not a stored flag. Subtopics: secondary post-launch — reserve modules.parent_module_id (nullable self-FK) in the M3 migration so large modules can nest later without a schema change; no subtopic UI at launch.

### Lesson types + participant rendering

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity L) |
| **Requested in** | (6) minus audio (→ audio row) + '(3) video/written/download/external resource/quiz' |
| **Covers** | video lesson · written lesson · PDF lesson · downloadable lesson · external link lesson · quiz lesson · mixed-media lesson |
| **Evidence** | `database.md: no lesson/media entities anywhere in the schema`; `decisions-brief A-07: video via hosted platform (Mux or Bunny — client/cost decision), not Supabase Storage` |
| **Gap** | No lesson rendering exists; the video pipeline (upload, playback, signed URLs) is the largest greenfield piece and its provider is unchosen. |
| **Depends on** | A-07 video platform selection (Mux vs Bunny — client/cost decision); modules/lessons schema (M3); private course-content storage bucket (A-09 pattern, established in M0/M1) |

M3 lesson_type enum: video / written (markdown body) / download / external / quiz. PDF and downloadable collapse into 'download' (resource attachment + viewer). Mixed-media: simplify — not a distinct type at launch; written lessons can gain embedded video/resource blocks post-launch. Quiz lessons depend on the practice-semantics decision (see structure row). Video is blocked on the A-07 provider selection — surface that client decision immediately since it gates the M3 build start and is a GDPR-processor question.

### Lesson metadata

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M3** (complexity S) |
| **Requested in** | (7) |
| **Covers** | title · description · objective · duration · required flag · attached resources · instructor notes · glossary terms link · tags · availability rules |
| **Evidence** | `supabase/migrations/0003_localized_content_columns.sql — the _de/_en localized-column convention new lesson text fields must follow (A-12)` |
| **Gap** | All metadata is greenfield but consists of plain columns on the lessons table. |
| **Depends on** | lessons schema (M3) |

Ship title/description/objective/duration_minutes/required/instructor_notes as columns in the M3 lessons migration plus resource attachments — marginal cost near zero. Defer glossary-term links and tags until glossary/search/library exist (their rows); 'availability rules' are realized by module release_rule + progression gating (rows 13/14), not a per-lesson rule engine — do not build one.

### Audio-only mode

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | simplify → **M6** (complexity S) |
| **Requested in** | (8) + '(3)/(6) audio lesson type' |
| **Covers** | dedicated audio upload · audio-version-of-video · auto-extraction from video · browser audio mode · background playback · mobile limits · 'do not add automatic media processing unless justified' rule |
| **Gap** | No media model exists at all; no evidence the curriculum needs audio delivery. |
| **Depends on** | lessons schema (M3); private course-content bucket (A-09 pattern); client confirmation of curriculum need |
| **Risk of building now** | Auto-extraction/background playback would drag in a media-processing pipeline and app-like playback work with zero validated demand — exactly what the scope's own rule warns against. |

Confirm the standing disposition: if (and only if) the client's curriculum needs it, add a nullable audio_url per lesson (dedicated upload, private bucket, native <audio> element). No auto-extraction, no transcoding pipeline, no background-playback engineering — browser/OS default behavior and its mobile limits are accepted as-is. Revisit only on concrete client demand.

### Bookmarks + favorite resources

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity S) |
| **Requested in** | (9) + (21) |
| **Covers** | bookmark lessons · bookmark videos · bookmark downloads · bookmark glossary terms · bookmark library entries · favorite resources |
| **Gap** | Per-account feature with no account to anchor to; participants exist only as admin-created rows reached by token. |
| **Depends on** | participant accounts (A-02, M1); lessons/resources/glossary entities (M3+) |
| **Risk of building now** | Built now it would anchor to raw participant rows and need rework once accounts + RLS land; zero launch value. |

Combine (9)+(21) into a single polymorphic bookmarks table (participant_id, target_type in lesson|resource|glossary_term, target_id, unique triple) — 'favorite resources' is just bookmarks filtered to resources, not a second feature. Build after participant accounts and the M3 content exist; surfaces: toggle on lesson/resource/glossary views + a dashboard list.

### Personal notes

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (10) |
| **Covers** | notes on course · notes on module · notes on lesson · notes on video timestamp · private unless shared |
| **Gap** | No account anchor, no lesson/video entities to attach notes to. |
| **Depends on** | participant accounts (A-02, M1); lessons + video player (M3) |
| **Risk of building now** | Same account-anchor rework risk as bookmarks; sharing semantics would invite privacy design work best deferred until the GDPR workflows (M6) are defined. |

Post-launch per the brief's deferred-within-M3 list. v1 = private-only notes (participant_id + nullable course_id/lesson_id + nullable video_timestamp_seconds + body); drop the 'shared' mechanism entirely at first (defer-low-value secondary — sharing adds visibility/moderation/GDPR questions with no clear consumer). Timestamp notes require the video player integration, so notes land after video ships.

### Completion tracking + course completion rules

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity M) |
| **Requested in** | (11) |
| **Covers** | manual completion · automatic completion · video completion · quiz completion · download acknowledgement · required lesson/module completion · weighted progress · course completion rules |
| **Evidence** | `database.md 'Target-LMS entities — absent': learner progress tracking (per-lesson completion) entirely absent`; `supabase/migrations/0005_attempt_progress.sql — attempts.answers autosave is the existing precedent for participant-progress persistence` |
| **Gap** | No progress entity; assignment.status is the only 'progress' in the system and its in_progress value is never even written (dead enum, confirmed in production). |
| **Depends on** | enrollments (A-03, M1); modules/lessons (M3); generalized audit log (M1) for admin overrides |

M3: lesson_progress keyed (enrollment_id, lesson_id) with status not_started→in_progress→completed, completion_source enum (auto_view, video_threshold, quiz_pass, download_ack, manual_participant, manual_admin), last_position_seconds + watched_pct for video. Course progress % = completed required lessons / total required lessons — unweighted at launch (weighted progress deferred per brief; adding a weight column later is non-breaking). Course completion = all required modules complete; cache progress_pct on enrollments for dashboard cards. Download acknowledgement = explicit 'mark as read' click, not download-event tracking. Admin manual completion overrides must write to the M1 generalized audit log.

### Minimum watch requirement (video completion threshold)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | simplify → **M3** (complexity S) |
| **Requested in** | (12) |
| **Covers** | ~90% watch threshold · seeking · playback speed · rewatch · multi-device · interruptions · false completion · accessibility · compliance-signal-not-competence-proof framing |
| **Evidence** | `candidate-assessment.md: attempt autosave (700ms debounce, last-write-wins, bounded sanitizer) is the proven heartbeat/persistence pattern to replicate for playback position` |
| **Gap** | No player, no heartbeat, no threshold config exist. |
| **Depends on** | video player integration (A-07); lesson_progress (M3) |
| **Risk of building now** | Anti-cheat watch enforcement is expensive, user-hostile, trivially defeated, and pointless given certification already rests on a proctorless exam — the brief's simplify call stands. |

Confirm the standing challenge and ship the simplified version inside M3 video completion: heartbeat every ~10s records position + cumulative watched_pct; lesson auto-completes at a configurable threshold (default 90, per-lesson override). Explicitly allow seeking, speed changes, and rewatching; multi-device = last-write-wins like attempts.answers; interruptions covered by resume-from-position. No seek-blocking, no speed policing, no anti-cheat (A-07): false completion is accepted because competence is proven by the existing exam chain — record watch data as a compliance signal only. Accessibility path: admin manual completion + written alternative where provided.

### Locked progression dependencies

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity M) |
| **Requested in** | (13) |
| **Covers** | previous lesson complete · previous module complete · quiz completion gate · minimum quiz score gate · scheduled date gate · cohort release gate · admin approval gate · enrollment state gate · active entitlement gate |
| **Evidence** | `decisions-brief M3: 'linear locked progression' is in the M3 core; entitlement gating per A-03` |
| **Gap** | No gating exists anywhere; the only access control in the system is assignment.active hiding a token. |
| **Depends on** | entitlements (A-03, M1); lesson_progress (M3); quiz lessons (M3/M4 decision) |

M3 ships two gates enforced in the participant DTO layer: (a) active entitlement + valid enrollment (hard gate on every learning read), (b) linear progression — previous required lesson/module must be complete, toggleable per course_version (linear_progression bool). Quiz-completion gate arrives with quiz lessons; min-score, scheduled-date, cohort, and admin-approval gates are deferred but representable in the typed release/gating rule fields so they are additive later. Enforce server-side (DTO layer), never client-only — same discipline as src/lib/certification/data.ts.

### Drip release

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (14) + '(5) scheduled/cohort/admin release' |
| **Covers** | days-after-enrollment release · calendar-date release · cohort schedule release · after-completion release · admin action release · module scheduled release · module cohort release · module admin release |
| **Gap** | No release machinery; every current course is delivered all-at-once. |
| **Depends on** | modules schema (M3) carrying release_rule; cohorts (client decision) for cohort schedules |
| **Risk of building now** | A release-rule engine multiplies M3's QA surface (every gate × every lesson type) while zero current courses need staged delivery. |

Schema-ready now, logic later: put a typed release_rule jsonb on modules in the M3 migration ({type:'immediate'|'days_after_enrollment'|'fixed_date'|'cohort'|'admin'}) with only 'immediate' honored at launch. Evaluation is a pure read-time function over (rule, enrollment.created_at, cohort schedule, admin release overrides) — no cron/jobs needed. 'After-completion' is already delivered by M3 linear progression, don't duplicate it as a drip type. Cohort-schedule release only if cohorts are confirmed (client decision). Admin-action release is the cheapest variant and a good first post-launch increment.

### Self-paced mode (default delivery model)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity S) |
| **Requested in** | (15) |
| **Covers** | self-paced access model as the default mode |
| **Evidence** | `production-truth.md: both live courses are one-shot certification programs; no time-based delivery exists` |
| **Gap** | Self-paced is trivially the default once entitlements exist — it is the absence of cohort/drip constraints plus an access window. |
| **Depends on** | entitlements (A-03, M1) |

M3 default: all published modules available at enrollment (subject to linear progression), access window = entitlement start + duration with expiry displayed on both dashboards. No dedicated machinery beyond what entitlements (M1) already provide; document explicitly that self-paced is the v1 delivery model so cohort mode stays a clean additive layer.

### Cohort mode

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | client-decision → **M6** (complexity XL) |
| **Requested in** | (16) |
| **Covers** | cohort defines course version · cohort start/end · cohort access duration · cohort module release dates · cohort deadlines · cohort instructor · participant group · cohort exam availability · cohort communications · multiple cohorts per course |
| **Evidence** | `admin-surfaces.md 'EXPLICITLY NOT POSSIBLE TODAY': no cohorts/groups/classes anywhere`; `docs-truth.md: grep cohort across repo — zero matches` |
| **Gap** | Fully absent, and the heaviest untriggered feature in the domain — it touches versioning, release, comms, roles, and exam scheduling at once. |
| **Depends on** | client confirmation of cohort-based delivery (D-level decision); enrollments with reserved cohort_id (M1); drip/release engine; course versioning pin (M3); instructor role (A-11); jobs/comms (A-05, M1) |
| **Risk of building now** | Multi-week build across schema, release logic, comms, and admin UI for a delivery model the client has not confirmed, in an academy with 17 participants — the definitive premature-complexity trap of this domain. |

Per the standing disposition: client decision, built (if confirmed) in M6 as cohorts (id, course_version_id, name, starts_on/ends_on, access_until, exam window, instructor) + cohort_module_releases (cohort_id, module_id, release_at) + enrollments.cohort_id. The only action now: reserve enrollments.cohort_id uuid NULL in the M1 enrollments migration so confirmation never forces a migration of the access backbone. Cohort communications ride the M1 jobs/email infrastructure; cohort instructor depends on the A-11 instructor role.

### Continue where you left off (resume)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M3** (complexity S) |
| **Requested in** | (17) |
| **Covers** | latest course · latest lesson · video position resume · latest resource · latest module · incomplete quiz state where safe |
| **Evidence** | `supabase/migrations/0005_attempt_progress.sql + src/app/certification/[accessToken]/attempt/attempt-form.tsx:56-67 — incomplete exam state (answers autosave + hydrate-on-reload) is ALREADY implemented and reliable for the assessment flow`; `candidate-assessment.md: resume pattern is shuffle-proof, keyed by question id, last-write-wins` |
| **Gap** | Learning-side resume is missing entirely, but the hardest sub-item (safe incomplete quiz state) is shipped for exams and its pattern is proven. |
| **Depends on** | lesson_progress heartbeat (M3); participant accounts (M1) for cross-course resume on the dashboard |

M3: resume is derived data, not new state — 'continue' target = enrollment with max(lesson_progress.updated_at); within a course = most recent in-progress lesson; video position from last_position_seconds. Index lesson_progress (enrollment_id, updated_at). Do not rebuild quiz-state persistence — reuse the attempts.answers autosave pattern for any in-lesson quiz. 'Latest resource' resume is low-value noise; drop it unless free.

### Participant search (content search)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (18) |
| **Covers** | course title search · module title search · lesson title search · written content search · glossary search · resource search · tag search · transcript search · global vs course-level scoping decision (challenge) |
| **Gap** | No searchable content exists yet; there is no participant search of any kind (admin lists have none either — that is a separate M1 item in the admin domain). |
| **Depends on** | written lesson content at volume (M3+); glossary/resource library (post-launch rows) |
| **Risk of building now** | Search built before the content schema stabilizes indexes a guess; with 2 courses it would return the sidebar. |

Confirm the brief's challenge: NO participant search in the first release — with one or two courses, the module list IS the navigation. When built: start course-level (titles + written lesson bodies) using Postgres tsvector with the german config — no external search infrastructure; expand to global + glossary + resources once those exist. Transcript search: exclude outright — no transcripts exist and A-07/scope rules forbid automatic media processing without justification; revisit only if transcripts are ever authored manually.

### Glossary

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M6** (complexity M) |
| **Requested in** | (19) |
| **Covers** | term · definition · synonyms · course/module/lesson relationships · illustration · related resources · contextual tooltips · central access page |
| **Gap** | Fully absent; standalone tables with no blocking prerequisite beyond lessons for contextual linking. |
| **Depends on** | lessons (M3) for contextual relationships; resources table (M3) for related resources |
| **Risk of building now** | Low technical risk but zero launch leverage; tooltip parsing would burn polish time the launch sweep needs elsewhere. |

Post-launch per the brief. v1 = glossary_terms (term_de/_en, definition_de/_en, synonyms text[], illustration_path) + lesson_glossary_terms join + a central glossary page; simplify contextual delivery to a 'terms in this lesson' panel driven by the join — hover-tooltip auto-linking inside rich text is fiddly parsing work with marginal value, do it last if ever. Related-resources = join to the resources table.

### Resource library + authorized downloads

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | simplify → **M3** (complexity M) |
| **Requested in** | (20) |
| **Covers** | filter by course · filter by module · filter by topic · filter by body area · filter by content type · filter by difficulty · filter by series · access-permission filtering · central library page |
| **Evidence** | `production-truth.md: the only storage bucket ('certificates') is PUBLIC — the private+signed-URL pattern (A-09) has to land before any entitlement-gated download can exist`; `supabase/migrations/0004_certificate_assets.sql — file-asset table pattern (typed asset rows + storage path) to mirror for resources` |
| **Gap** | No resource entity, no private storage, no authorization layer for files. |
| **Depends on** | entitlements (A-03, M1) for authorization; private storage + signed URLs (A-09, M0/M1); lessons schema (M3) |
| **Risk of building now** | The faceted library built now curates an empty shelf; the metadata columns cost nothing while the UI waits for content volume. |

Split it: M3 ships the load-bearing core — resources table + lesson/course attachments + entitlement-authorized signed-URL downloads from a NEW private 'course-content' bucket (A-09 pattern; never repeat the public-bucket mistake). The central cross-course faceted library (body area/difficulty/series/type filters) is post-launch — but carry the nullable metadata columns (tags text[], body_area, difficulty, series, resource_type) from day one so the library becomes a query + page, not a migration. Access-permission filtering = derived from entitlements, never a per-resource ACL.

### Course builder (admin authoring)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M3** (complexity XL) |
| **Requested in** | (22) |
| **Covers** | create courses/versions · add modules/subtopics/lessons · reorder · upload media · attach downloads · configure requirements/progression/drip/access duration/assessments · preview participant experience · publish · archive |
| **Evidence** | `src/app/(dashboard)/admin/courses/actions.ts:48-203 + topic-actions.ts — the schema.ts/actions.ts/form feature shape, Zod+FormState, guarded deletes, and sort_order CRUD are all established and reliable`; `admin-surfaces.md: questionnaire ordered picker (up/down reorder) and template SVG file-upload+validation pipeline are direct precedents for builder mechanics`; `admin-surfaces.md weakness: no pagination/search anywhere — builder lists must not repeat the unbounded-list pattern` |
| **Gap** | No authoring UI for any learning entity; media upload (especially video) is entirely new ground. |
| **Depends on** | course content schema (M3); A-07 video provider decision + upload API; private course-content bucket (A-09); M1 admin list pagination/search conventions (usability, not blocking) |

M3, following the existing admin feature shape exactly: version list per course → module list → lesson editor. Reorder via the proven up/down pattern (drag-drop is polish, not scope). Media: direct-to-storage upload for files, provider upload flow (Mux/Bunny direct upload) for video per A-07 — never through the Next.js server. Preview = render the participant lesson components read-only in admin context; this is NOT impersonation and stays consistent with A-11's impersonation deferral. Publish/archive per the versioning row (guard trigger gives hard safety). Hide drip/subtopic/cohort config until those ship; access-duration config belongs to the M1 entitlements admin — link there, don't duplicate. Requirements/assessments config = required flags + questionnaire pickers reusing existing course-scoped filtering.


## Assessment engine

### Final certification exam chain (token attempt flow, server grading, snapshots)

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (1) final certification exam |
| **Covers** | final certification exam (the questionnaire→assignment→attempt→certificate chain) |
| **Evidence** | `src/app/certification/[accessToken]/actions.ts:242-329 (submitAttempt re-grades from DB truth)`; `src/lib/certification/scoring.ts:66-94 (pure gradeAttempt, exact-set match)`; `src/lib/certification/data.ts:353-430 (recordAttempt: snapshot + attempt_answers + status + history)`; `production-truth.md: 23 attempts / 21 submitted, ALL invariants clean (0 double-open attempts, 9/9 passes have certificates)` |
| **Gap** | Narrow race defects: concurrent double-submit duplicates attempt_answers + history rows (0-row guarded update unchecked, data.ts:353-396); fail-path assignment update lacks the .neq('passed') DB guard the pass path has (data.ts:408-413); no single-open-attempt DB constraint; 'in_progress' assignment status exists in the CHECK/TS union but is never written. |

Keep the engine untouched; M0 = the A-08 hardening exactly: partial unique index on attempts(certification_assignment_id) WHERE submitted_at IS NULL, post-submit immutability trigger (designed with the M4 invalidation-column whitelist from day one), chain .select('id') on the submit update and abort on 0 rows, add .neq('status','passed') to the fail path. Resolve the dead enum by writing 'in_progress' at attempt-start (one-line in startOrResumeAttemptWith) rather than removing the value — it gives admins started-but-not-submitted visibility for free.

### Configurable pass threshold per certification

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (7) configurable threshold |
| **Covers** | pass threshold configurable per certification (questionnaires.passing_percentage) |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:143-144 (passing_percentage int default 80, CHECK 0-100)`; `src/lib/certification/scoring.ts:92-94 (passed = score >= threshold, inclusive)`; `supabase/migrations/0001_core_schema.sql:427-443 (content-lock trigger freezes threshold once any assignment exists)`; `production-truth.md: both live questionnaires at 80%` |
| **Gap** | None material. Threshold frozen once assigned is a feature (locked decision D3 edit=duplicate), not a bug. |

No work. Already exactly what the target scope asks for; the freeze-once-assigned trigger is the integrity guarantee competitors usually lack — keep it.

### Participant result feedback — current compliant surface

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (9) score/pass-fail + no-leakage policy |
| **Covers** | total score shown to participant · pass/fail shown to participant · policy: never show exact wrong answers / correct answers / bank exposure for final exams |
| **Evidence** | `src/app/certification/[accessToken]/result/page.tsx:64-165 (passed celebration + score; failed: score, threshold, topic recommendations, retake)`; `src/lib/certification/data.ts:596-616 (getLatestResult selects ONLY score/passed/recommendation_snapshot/submitted_at)`; `src/lib/certification/scoring.ts:96-127 (buildRecommendations: topic-grouped texts from wrong questions, never the questions themselves)`; `candidate-assessment.md: "already compliant" — is_correct stripped before client (attempt/page.tsx:76-83)` |
| **Gap** | Only edge: mixed-language result screen possible (live-locale chrome around frozen-language recommendation snapshots) — fully latent since EN has never been enabled in production. |

Keep the policy exactly as implemented; it is the correct final-exam posture and must not be loosened when practice modes arrive (explanations belong ONLY to non-final purposes). No M0 work beyond documenting the latent i18n edge.

### Question bank core: CRUD + implemented types + core fields

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (3) initial single/multiple choice; (4) core fields + create/edit/retire/restore |
| **Covers** | initial single choice type · multiple choice type · question text field · options · correct answer · explanation · course link · topic link · active flag · last edited (updated_at) · create question · edit question · retire (deactivate) · restore (reactivate) |
| **Evidence** | `src/app/(dashboard)/admin/questions/actions.ts:53-235 (create/edit/toggle/guarded-delete, topic↔course validation)`; `src/app/(dashboard)/admin/questions/schema.ts:9-42 (options 2-12, exactly-one-correct for single_choice)`; `supabase/migrations/0001_core_schema.sql:94-119 + 0003 (questions/question_options incl. explanation, recommendation_text, _de/_en, updated_at)`; `src/types/database.ts:18 (QuestionType = single_choice / multiple_choice)`; `production-truth.md: 44 questions / 229 options live` |
| **Gap** | updateQuestion deletes all options then reinserts with no transaction — partial failure leaves a question with zero options (actions.ts:176-190); no lock-status precheck, so editing an assignment-locked question fails only at save with a generic error. |

Launch as-is with two M0 fixes: move option replace into a single RPC/transaction (the audit's live data-loss risk), and precheck question_is_locked() to render a read-only/locked notice like questionnaires already do. Everything else in this row needs zero work.

### Question bank manager: search, filter, duplicate

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (4) manager functions: search/filter/duplicate |
| **Covers** | search questions · filter questions (beyond the single course filter) · duplicate question |
| **Evidence** | `src/app/(dashboard)/admin/questions/page.tsx:44-50 (course filter is the ONLY list filter in the entire admin)`; `admin-surfaces.md: no search input, no pagination anywhere; duplicate verified absent` |
| **Gap** | No free-text search, no topic/type/status filters, no pagination, and — critically — no duplicate action even though content-locking makes 'edit = duplicate' the ONLY edit path for any question used by an assignment (locked decision D3). Admins must manually re-type locked questions today. |
| **Depends on** | M1 shared admin list pagination/search infrastructure |

Build inside M1's admin list pagination/search/filters workstream (explicitly in the M1 skeleton): server-side ilike search over question_text_de/_en, filters for topic/type/active, shared pagination. Add duplicate (copy question + options, suffix title, active=false default) — it is an S-sized action that operationalizes locked decision D3 and belongs in M1, not M4.

### Question bank metadata extensions (module, difficulty, author, review state, versioning)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (4) extended fields + version function |
| **Covers** | module field on questions · difficulty field · author field · review state field · version field + version function (duplicate-with-lineage) |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:94-106 (questions table has none of these columns)`; `decisions-brief.md D3: edit = duplicate is the locked versioning model` |
| **Gap** | No difficulty/author/lineage/review columns. In-place version numbers are moot — content-locking already forbids editing used questions, so versioning IS duplication with lineage; nothing records that lineage today. |
| **Depends on** | M3 modules (module field only); Question bank manager row (duplicate action carries the lineage) |
| **Risk of building now** | Columns without their M4 consumers (sampling, analytics) are dead schema weight and admin-form clutter that will be second-guessed when the real requirements land. |

Ship in the M4 assessment migration: difficulty ('easy'|'medium'|'hard', nullable — required input for difficulty-distribution sampling), created_by_admin_id (SET NULL), superseded_by_question_id self-FK powering duplicate-with-lineage. Simplify (secondary): review state collapses to draft/published — a full review workflow (reviewer, states, comments) is unjustified for a 3-admin team; challenge it if the client insists. Module FK only after M3 lessons exist.

### Question bank import/export

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | defer-low-value → **M6** (complexity M) |
| **Requested in** | (4) manager functions: import/export |
| **Covers** | import questions · export questions |
| **Evidence** | `admin-surfaces.md: no CSV/XLSX import or export on any surface (verified absent)`; `production-truth.md: 44 questions / 229 options total — trivial volume` |
| **Gap** | No bulk in/out at all. |
| **Depends on** | M6 exports bundle |
| **Risk of building now** | Weeks of validation edge-cases for a workflow the client will not exercise at current authoring volume. |

Defer, mirroring the standing CSV-import disposition: at 44 questions, manual authoring outpaces building and validating an importer (options, correctness flags, DE/EN dual-write, lock interactions make it deceptively fiddly). Export ships cheaply inside the M6 exports bundle; revisit import only against a concrete bulk-authoring event (new course with hundreds of questions).

### True/false question type

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | simplify → **M4** (complexity S) |
| **Requested in** | (3) true/false |
| **Covers** | true/false question type |
| **Evidence** | `src/types/database.ts:18 (single_choice already expresses two-option/one-correct exactly)` |
| **Gap** | No dedicated type — but none is needed; a true/false question IS a single_choice with two fixed options. |
| **Risk of building now** | Trivial cost, but a distinct DB type built now would permanently pollute the type union and every snapshot/scoring switch for no scoring benefit. |

Do NOT add a DB type (challenging the scope): implement as an authoring preset button on the question form that seeds two Richtig/Falsch options on a single_choice question. Zero migration, zero scoring change, zero candidate-flow change. Ride along with M4 question-form work.

### Ordering + matching question types

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | client-decision → **client-decision** (complexity L) |
| **Requested in** | (3) ordering, matching |
| **Covers** | ordering question type · matching question type |
| **Gap** | The entire answer pipeline is a set of option UUIDs (attempt_answers.selected_option_ids uuid[], AnswerMap Record<qid,string[]>, exact-set scoring) — order and pairing are inexpressible. These types force the platform's first generalized response payload (jsonb) plus typed scoring dispatch, new snapshot shapes, new candidate UI, and a partial-credit policy decision. |
| **Depends on** | Generalized per-type answer payload model (jsonb response column + scoring dispatch) — does not exist; M4 attempt blueprint |
| **Risk of building now** | Building on today's uuid[] answer model would bake in a second, incompatible answer representation that every snapshot, viewer, and analytics consumer then has to special-case forever. |

Challenge justification (as the scope invites): exact-order scoring is brutally harsh, partial credit introduces the first non-binary scoring semantics, and nothing in the current strength/rehab item bank demonstrates sequencing/pairing pedagogy that single/multiple choice can't approximate. Default NO for v1; if the client confirms curriculum need, build post-M4 on top of the generalized response model, never before it.

### Advanced question types (scenario-branching, hotspot, written, file, video)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M6** (complexity XL) |
| **Requested in** | (3) later types |
| **Covers** | scenario-branching questions · image hotspot questions · written answer questions · file submission questions · video submission questions |
| **Gap** | Beyond the response-model gap, written/file/video flip the engine from fully auto-graded to human-graded: a grading queue, grader assignment, feedback loop, and storage/upload pipeline — none exist. Scenario-branching is an authoring engine unto itself. |
| **Depends on** | Generalized response model (see ordering/matching row); A-05 jobs/outbox (processing); A-07/A-09 media storage + signed URLs; manual grading queue workflow — does not exist |
| **Risk of building now** | Multi-week engine rework for question styles with zero authored content, while the same effort funds the entire M4 upgrade set. |

Per the standing disposition: post-launch, backlog-only, built solely against concrete curriculum demand. Secondary: treat as defer-low-value until then — the certification value proposition (verifiable, objective, snapshot-frozen exams) is strongest with auto-graded items; human-graded submissions dilute it and add admin workload the 3-person team hasn't asked for.

### Order randomization (existing shuffle flags)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | post-launch → **M4** (complexity S) |
| **Requested in** | (5) randomized answer order |
| **Covers** | randomized answer order (and question-order shuffle as implemented today) |
| **Evidence** | `src/app/certification/[accessToken]/attempt/page.tsx:17-24,69-83 (Math.random Fisher-Yates, re-randomized EVERY server render)`; `supabase/migrations/0001_core_schema.sql:145-146 (both flags default false)`; `production-truth.md: both live questionnaires have randomize flags FALSE — the defect is latent in prod` |
| **Gap** | Shuffle is display-only, reshuffles on every reload (confusing on paginated resume), uses unseeded Math.random, and the displayed-order audit columns trust the client-posted order. No per-attempt frozen seed/set exists. |
| **Depends on** | M4 attempt blueprint (attempts.question_set) |
| **Risk of building now** | Near-zero user-visible payoff now (flags off in prod) and guaranteed rework when the M4 blueprint lands. |

Fold into the M4 attempt blueprint rather than fixing standalone: freezing attempts.question_set (ordered question ids + per-question option order) at attempt-start fixes reshuffle-on-resume, makes the displayed-order audit trustworthy server-side, and is the same structure pool sampling needs. Fixing it twice is waste; prod flags being off means nobody is currently exposed.

### Question pool selection (sampling, balancing, repeat prevention)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity L) |
| **Requested in** | (5) pool randomization |
| **Covers** | random selection from pool · topic-balanced pools · difficulty distribution · required count per topic · exclude retired questions · prevent exact repeats across attempts |
| **Evidence** | `src/lib/certification/data.ts:188-211 (verified this session: loads ALL questionnaire_questions, no .eq('active', true) — retired questions are still served to candidates)`; `production-truth.md: 44 questions / 44 questionnaire_questions links — the bank exactly equals the exam; sampling would be a no-op today` |
| **Gap** | Full question set always served; no sampling, no quotas, no difficulty mix, no repeat prevention. Bonus live gap: deactivating a question does NOT remove it from live exams (only the questionnaire edit form filters to active). |
| **Depends on** | questions.difficulty (metadata row); M4 attempt blueprint; client authoring surplus (~2-3x questions per topic) — content dependency, not code |
| **Risk of building now** | With bank size == exam size, sampling is mathematically a no-op; building now delivers zero behavior change while adding selection complexity to a flow that must stay stable through M0-M2. |

M4 core: questionnaire_selection_rules table (per-topic required_count + optional difficulty mix), questionnaires.pool_mode flag, selection executed at attempt-start into the frozen attempts.question_set; prevent-exact-repeats by penalizing the previous attempt's set during sampling; serve-time active filter (with a carve-out honoring already-frozen blueprints). Flag loudly: the REAL dependency is curriculum authoring — the client must write a 2-3x surplus of questions per topic before pools do anything; engineering is not the long pole. Note the content-lock tension: pool membership freezes once assigned; pool edits = duplicate questionnaire, consistent with D3.

### Weighted questions with understandable participant results

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | client-decision → **client-decision** (complexity M) |
| **Requested in** | (6) + (4) weight field |
| **Covers** | weight field on questions · weighted scoring with understandable participant results |
| **Evidence** | `src/lib/certification/scoring.ts:66-94 (uniform weight, score = correct/total — pure function, easy to extend)`; `decisions-brief.md standing disposition: weighted questions → schema-ready, client decision on curriculum need` |
| **Gap** | No weight column, no weighted math, no result-display design for non-uniform scores. |
| **Depends on** | M4 migration window (column); critical/floors row (overlapping curriculum decision — decide together) |
| **Risk of building now** | Enabling weights changes the meaning of scores relative to all 21 historical attempts and the 80% threshold semantics — irreversible comms/comparability cost if flipped casually. |

Follow the standing disposition exactly: add nullable questions.weight numeric(4,2) in the M4 migration (schema-ready, inert, NULL=1.0) but wire scoring only on explicit client confirmation. Challenge to relay: weighting directly fights 'understandable participant results' — the score stops equaling questions-correct, which candidates and support must then explain; topic-balanced selection plus a critical-question flag deliver most of the pedagogic goal without opaque math.

### Topic floors + critical-safety question rules

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | client-decision → **client-decision** (complexity M) |
| **Requested in** | (7) topic minimum, critical questions, anti-accidental-pass |
| **Covers** | optional mandatory-topic minimum (topic floors) · critical-safety question rules · no accidental pass via unrelated strength |
| **Evidence** | `src/lib/certification/scoring.ts:66-94 (single aggregate score is the only pass criterion)` |
| **Gap** | No per-topic minimums, no must-answer-correctly flag, pass is one aggregate percentage. |
| **Depends on** | M4 pool selection (floors only meaningful with sampling); attempts.topic_scores (feedback row) |
| **Risk of building now** | Floors without pools produce confusing failures with no integrity gain, guaranteed support burden, and likely rollback. |

Challenge topic floors for the initial course (as the scope directs), with evidence: today's exam serves EVERY question across all 8 topics, so a pass already requires 80% of a fully topic-representative set — 'accidental pass via unrelated strength' is structurally limited, and floors would add candidate-hostile failures ('85% but failed'). The concern becomes real only when M4 pools sample subsets — couple the decision to pool activation. Schema-ready in M4: min_percentage on questionnaire_selection_rules + questions.is_critical boolean, both inert until the client confirms curriculum policy. Critical-safety wording for a rehab curriculum: flag secondary professional-review (curriculum/legal owner should sign off on what 'safety-critical' failure means).

### Attempts, retries, cooldowns, practice-vs-exam rules

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (8) |
| **Covers** | unlimited attempts · new randomized exam per attempt · full attempt history · cooldowns (1st fail immediate review, 2nd 12h, further 24h) · different rules for practice vs certification |
| **Evidence** | `src/app/certification/[accessToken]/attempt/page.tsx:34-39 (only 'passed' blocks a new attempt — unlimited immediate retakes)`; `src/app/certification/[accessToken]/result/page.tsx:160-162 (retake CTA)`; `supabase/migrations/0001_core_schema.sql:222 (unique(assignment, attempt_number) — full history already persisted in DB)`; `candidate-assessment.md weakness: identical full exam every attempt; only brake is the 20/min submit rate limit` |
| **Gap** | Unlimited attempts and complete DB history exist; missing: any cooldown, per-attempt exam regeneration (same questions, same base order every retake with prod flags off), candidate sees only the latest result, and no practice-vs-certification rule split (no purposes exist). |
| **Depends on** | Pool selection row (new exam per attempt); questionnaires.purpose (assessment types row) |
| **Risk of building now** | Building full retry policy now entangles it with purpose semantics that don't exist yet; the interim exposure (memorization brute-force on an identical exam) is real but bounded by tiny candidate volume — 17 participants, all invited. |

M4: adopt the suggested ladder as per-questionnaire columns (cooldown_minutes_first/second/subsequent, defaults 0/720/1440), enforced server-side at attempt-start against the newest submitted attempt's submitted_at, surfaced on the hub as next-eligible time; keep attempts unlimited (no cap) per scope; per-attempt regeneration arrives free with pool sampling; practice purposes get cooldown 0. Pull-forward option to name for the client: a single fixed cooldown check is S-sized and can ship in M1 if exam-integrity worry predates M4 — without pools, cooldowns are the only brute-force brake.

### New assessment types: lesson quiz, module quiz, practice exam

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (1) non-final assessment types |
| **Covers** | lesson quiz · module quiz · practice exam |
| **Gap** | Exactly one assessment construct exists (questionnaire = final certification exam). No purpose discriminator, no lesson/module anchors to hang quizzes on, feedback policy hardwired to the final-exam no-explanations stance, every pass issues a certificate. |
| **Depends on** | M3 modules/lessons (A-06 quiz-link) for lesson/module quizzes; M4 questionnaires.purpose column; Enhanced feedback row (explanations policy) |
| **Risk of building now** | Quiz types built before lessons exist are orphan assessments with no placement surface, and purpose semantics would be guessed now and re-guessed in M3/M4. |

M4: add questionnaires.purpose ('final_exam' default | 'practice_exam' | 'diagnostic' | 'lesson_quiz' | 'module_quiz'), frozen by the content-lock trigger; certificate issuance and assignment pass semantics gated to final_exam only; per-purpose feedback policy (show_explanations). Lesson/module placement comes from M3's quiz-link lesson type (A-06) pointing lessons at questionnaires — keep the pointer on the lesson, not the questionnaire. Practice exams reuse the pool + cooldown-0 machinery.

### Pre-course diagnostic (baseline, non-certifying)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (2) + (1) pre-course diagnostic |
| **Covers** | pre-course diagnostic assessment type · baseline non-certifying run · focus recommendations from diagnostic · initial-vs-final comparison · anonymized curriculum insights |
| **Evidence** | `src/lib/certification/scoring.ts:96-127 (topic-grouped recommendation engine — directly reusable for focus recommendations)`; `supabase/migrations/0001_core_schema.sql:209-223 (attempt/recommendation snapshots are purpose-agnostic)` |
| **Gap** | No non-certifying path exists — recordAttempt's pass branch immediately issues a certificate (data.ts:399-407); no purpose flag; no per-enrollment linkage, so 'initial vs final' has no durable spine to join across. |
| **Depends on** | M1 enrollments/entitlements (A-03); questionnaires.purpose (assessment types row); attempts.topic_scores (enhanced feedback row) |
| **Risk of building now** | Built pre-M1 the diagnostic would key off assignments alone, leaving nothing stable to compare the final against once enrollments become the durable spine — a rework guarantee. |

M4 (as the skeleton's 'diagnostics'): purpose='diagnostic' questionnaires ride the existing assignment/attempt chain with certificate issuance and pass/fail semantics suppressed (assignment completes, never certifies); focus recommendations = existing buildRecommendations output surfaced as 'start here' guidance; initial-vs-final = per-enrollment join of diagnostic vs final_exam attempts' topic scores; anonymized curriculum insight = an aggregate admin query over the same data, no new tables and no per-candidate exposure. Requires M1 enrollments (A-03) to anchor the comparison.

### Enhanced participant feedback (topic scores, module recommendations, readiness, practice explanations)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (9) enhanced items |
| **Covers** | topic-level performance shown to participant · recommended modules · readiness guidance · practice quizzes may show explanations |
| **Evidence** | `src/lib/certification/scoring.ts:96-127 (topic grouping exists but only as fail-recommendations, no per-topic scores)`; `supabase/migrations/0001_core_schema.sql:228-237 (attempt_answers question_snapshot carries topic — per-topic scores are computable today)` |
| **Gap** | No per-topic percentage shown anywhere; 'recommended modules' impossible (no modules); no readiness guidance; explanations (questions.explanation exists as a column) are never shown to any candidate. |
| **Depends on** | M3 modules/lessons (module recommendations); questionnaires.purpose + show_explanations (assessment types row) |
| **Risk of building now** | Topic-level display without modules dead-ends in advice the current recommendations already give; building guidance copy twice. |

M4: freeze attempts.topic_scores jsonb at submit (cheap, one write in recordAttempt) — it powers candidate topic bars, the admin viewer, and analytics from one source instead of re-parsing snapshots three ways. Recommended modules = topic→module mapping once M3 lands; readiness guidance = simple rule over diagnostic/practice topic scores ('ready to attempt the final'). Explanations shown ONLY when purpose != final_exam and show_explanations is set — the final-exam no-leakage policy in the compliant-feedback row must remain untouchable.

### Admin attempt viewer

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (10) |
| **Covers** | view every attempt · questions delivered · selected answers · correct answers · time spent · topic scores (admin view) · attempt date · completion state · technical error state · integrity metadata (non-invasive) |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:228-237 (attempt_answers already stores question_snapshot, selected_option_snapshots, correct_option_ids, is_correct, displayed order — the viewer's entire dataset exists)`; `admin-surfaces.md: 'no attempt-history viewer for admins — attempts/scores never surfaced in the admin UI' (verified absent)`; `production-truth.md: 392 attempt_answers rows ready to display` |
| **Gap** | Zero admin visibility into attempts despite the data being fully captured since Slice 1. Duration is derivable (submitted_at - started_at) but coarse; no technical-error state; no integrity metadata beyond displayed order. |
| **Depends on** | none for the read-only core; A-10 Sentry (M0) for error state |
| **Risk of building now** | Deferral cost is admin blindness during any score dispute — with a live paying academy that becomes a support liability; building early is low-risk since it is read-only over frozen snapshots. |

M4 per skeleton, but this is the strongest pull-forward candidate the brief itself names: recommend pulling into M1 — a read-only drill-in on the participant detail page (attempt list → per-question snapshot vs selected vs correct, duration, manual_pass flag surfaced so synthetic 100% attempts are never mistaken for real exams) needs ZERO schema change and directly serves support/dispute handling. Integrity metadata: stay minimal per scope — duration + stored display-order fidelity is enough; explicitly do NOT add per-question timers or tab/focus tracking. Technical-error state comes from M0's Sentry + A-05 jobs, not new attempt columns; add attempts.last_activity_at (piggyback on autosave) for abandonment/duration quality.

### Manual pass

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (11) |
| **Covers** | explicit permission (admin-gated) · reason required · note · optional attachment · responsible admin recorded · timestamp recorded · audit event |
| **Evidence** | `src/app/(dashboard)/admin/participants/actions.ts:473-535 (requireAdmin, reason >=3 chars, rejects already-passed, stamps status/passed_at/passed_by_admin/manual_pass_reason)`; `src/lib/certification/data.ts:443-575 (idempotent synthetic 100% attempt, manual_pass:true in snapshots)`; `admin-surfaces.md: manual_pass history event with reason in event_data (backend-only)` |
| **Gap** | No separate note field (reason doubles as it), no attachment, reason validated inline rather than via Zod, certificate not auto-emailed after manual pass. |

Already shipped and verified — launch as-is. Secondary simplify: fold 'note' into the existing reason field permanently. Secondary defer-low-value: attachment upload needs storage plumbing for a rare admin act — revisit only with M6 admin-ops if a real evidence-filing need appears. One M4 tie-in: the attempt viewer must render the manual_pass flag prominently.

### Attempt invalidation

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (12) |
| **Covers** | invalidate attempt: technical malfunction · invalidate attempt: duplicate · invalidate attempt: integrity concern · invalidate attempt: admin error · original attempt preserved |
| **Evidence** | `admin-surfaces.md: no invalidation/reset surface exists (verified absent)`; `supabase/migrations/0001_core_schema.sql:581-584 (attempts freely mutable/deletable under admins_all — today the only 'invalidation' is destructive edit, the exact opposite of preserve-the-original)` |
| **Gap** | No invalidation model at all; the current schema's unrestricted attempt mutability is the anti-pattern the scope exists to prevent. |
| **Depends on** | A-08 post-submit immutability trigger (M0) — MUST be designed with this column whitelist now; Admin attempt viewer (UI home); M5 certificate revocation/lineage for the certifying-attempt case |
| **Risk of building now** | The real risk runs the other way: if M0 ships a blanket freeze trigger without the invalidation whitelist, M4 needs a second trigger migration — coordinate the trigger design now even though the UI waits. |

M4 (brief flags it pull-forward-eligible with the viewer): additive columns on attempts — invalidated_at, invalidated_by_admin_id (SET NULL), invalidation_kind CHECK in the four causes, invalidation_reason, plus an all-or-none CHECK; original row untouched forever (A-08 immutability trigger whitelists exactly these columns); getLatestResult/analytics exclude invalidated attempts; account_history 'attempt_invalidated' event; assignment status recomputed from remaining attempts. Hard edge to design deliberately: invalidating the certifying attempt must route into certificate revocation (M5 lineage), never silent deletion.

### Assessment analytics

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M4** (complexity M) |
| **Requested in** | (13) + (4) performance/usage functions |
| **Covers** | pass rate · average score · attempts per participant · topic weakness · question failure rate · question discrimination · attempt duration · abandonment · diagnostic-vs-final comparison · review question performance/usage (bank manager) · detect ambiguous questions · usage count (derived) · performance stats (derived) |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:228-237 (attempt_answers.question_id SET NULL keeps stats joinable across question deletion; snapshots carry topic)`; `admin-surfaces.md: zero analytics beyond 5 dashboard count tiles (verified absent)`; `production-truth.md: 21 submitted attempts / 392 answer rows total — statistically tiny` |
| **Gap** | No analytics surface of any kind; all raw material (per-answer correctness, topics, timestamps, attempt counts) already persisted. |
| **Depends on** | Pre-course diagnostic row (comparison metric); attempts.last_activity_at (viewer row); M6 for discrimination/ambiguity detection |
| **Risk of building now** | At 21 submitted attempts every chart is empty-or-noise, eroding client trust in the numbers; no view built now survives the M4 purpose/pool schema changes unmodified. |

M4 v1, deliberately thin: two SQL views — question_stats (times served, failure rate = usage count + performance stats, satisfying the bank-manager 'review performance/usage' function) and questionnaire_stats (pass rate, average score, attempts per participant, topic weakness) — rendered as admin dashboard cards; duration from submitted_at - started_at improved by attempts.last_activity_at; abandonment = open attempts stale >24h (prod already has 2 open attempts to show). Explicitly defer to M6 (standing disposition): discrimination and ambiguous-question detection — with 21 submitted attempts, any discrimination index is noise; set a minimum-n gate (e.g. 30 deliveries per question) before either renders. Diagnostic-vs-final activates only after the diagnostic row ships.


## Certification system

### Issuance pipeline with explicit partial-failure handling and retry

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity L) |
| **Requested in** | (1) Issuance flow |
| **Covers** | passing attempt finalized triggers certification record · unique ID minted at issuance · assets generated as pipeline step · verification activated · email sent as tracked step · portal updated on issue · audit events for every step · explicit partial-failure handling · must not read 'fully issued' when PDF/QR/verification/storage/email failed · recoverable states + retry |
| **Evidence** | `src/lib/certificate/issue.ts:31-195 — synchronous, NOT transactional; non-23505 insert errors return null with zero logging (issue.ts:167-169); assignment.certificate_id UPDATE result ignored (issue.ts:172-175)`; `src/lib/certificate/issue.ts:124-194 — 23505 retry loop conflates number collisions with the assignment UNIQUE constraint; concurrent submits can burn 3 retries and return null`; `src/app/(dashboard)/admin/participants/[participantId]/assignments-section.tsx:307-313 + participants/actions.ts:497-499 — passed-without-certificate shows static 'certificate pending', manualPass refuses, nothing ever re-invokes issueCertificate (recovery = DB surgery)`; `src/lib/certificate/generate.ts:118-131 — asset failure logged to history only when participantId resolves; AssetGenerationResult.error discarded by both callers (issue.ts:189, participants/actions.ts:555)`; `src/lib/certification/data.ts:399-407 — asset generation (multi-second resvg render + 2 uploads) runs inline in the candidate's submit request; serverless-timeout exposure`; `src/lib/public-url.ts:6-18 — relative verification_url frozen forever into snapshot+QR if NEXT_PUBLIC_SITE_URL unset (0 occurrences in prod, but unguarded)`; `production-truth: 9/9 certificates have both assets and certificate_id set — chain has worked so far at tiny volume; history events certificate_generated 9 / certificate_assets_generated 9 / 0 generation failures` |
| **Gap** | Best-effort chain with silent failure points; no issue-retry when the certificates INSERT itself fails on a passed assignment; asset/email outcomes invisible to admins; render runs inline in the candidate request; no distinction between 'generating' and 'failed'. |
| **Depends on** | jobs/outbox table + cron drainer (A-05, M1) for the async half; email_events + Resend webhook (M1) for truthful email-sent state; certificate state machine columns (this domain, M0) |

M0 per A-08: (a) admin 'Issue certificate' retry button for passed-assignments-without-certificate (idempotent issueCertificate already supports it — the missing piece is just a caller), (b) log every failure path (structured log + account_history certificate_issue_failed with error detail), (c) fail hard at boot/issue when NEXT_PUBLIC_SITE_URL is unset, (d) fix the 23505 retry to re-fetch the winner's row. M1 per A-05: move asset generation + certificate email onto the jobs outbox (job types certificate.generate_assets, certificate.send_email) so the candidate request only flips status and enqueues; email step becomes truthful via email_events/Resend webhook. Secondary: switch email attachment from snapshot SVG to the official PDF while touching the send path (acknowledged follow-up, docs/slice-6-apply-checklist.md:67-68). 'Portal updated' step activates at M5 with the credential portal.

### Certificate state machine

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (5) Certificate states |
| **Covers** | pending state · generating state · valid state · generation-failed state · revoked state · expired state · replaced state · pending-review state |
| **Evidence** | `supabase/migrations/0001_core_schema.sql:255-258 — certificates.status CHECK in ('valid','revoked') only`; `supabase/migrations/0004_certificate_assets.sql:5-20 — certificate_assets has NO status/error column; row existence = generated; failed and never-generated are indistinguishable`; `src/app/(dashboard)/admin/participants/[participantId]/assignments-section.tsx:288-292 — 'assets pending' label covers both still-generating and failed`; `database audit weakness: no CHECK ties status='revoked' to revoked_at NOT NULL; inconsistent rows representable` |
| **Gap** | Only valid/revoked exist; asset lifecycle has no state at all; 'replaced' unrepresentable; no DB-level state-consistency guards. |
| **Depends on** | issuance pipeline retry/logging row (same M0 migration) |

M0 per A-08: extend certificates.status CHECK to ('valid','revoked','replaced') and add assets_status ('pending','generating','complete','failed') + assets_error text; add per-row status/error to certificate_assets; add a CHECK/trigger tying revoked→revoked_at and replaced→replaced_by NOT NULL; backfill 9 live certs to assets_status='complete' (instant at this volume). Surface the two-column state (lifecycle × assets) in admin. CHALLENGES to the target list, keep explicit: 'expired' EXCLUDED (locked: certificates never expire — decisions-brief standing); 'pending review' EXCLUDE — no review workflow exists or is planned, manual-pass is already fully audited (manual_pass_reason + history), a ninth state adds admin burden with no consumer; revisit only if the client asks for pre-issue QA. 'replaced' state ships in the M0 migration but is first written by the M5 replacement feature.

### Official print formats (PDF + high-res raster)

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (2) Formats — print half |
| **Covers** | printable PDF · high-res PNG · high-res JPG |
| **Evidence** | `src/lib/certificate/generate.ts:29-132 + src/lib/certificate/assets.ts:84-116 — 300-DPI PNG via resvg (bundled Barlow fonts, Illustrator font-token normalization) and pixel-identical A4-landscape PDF via pdf-lib; real-render tests (assets.test.ts:38-69)`; `production-truth: 9/9 certificates have BOTH official_pdf + official_png_preview assets; storage bucket 'certificates' exists (public)`; `src/lib/certificate/storage.ts:12-37 — stable per-certificate paths, upsert regeneration; weakness: same-URL overwrite with no cache-busting (CDN may serve stale files after regenerate)` |
| **Gap** | JPG variant absent; regeneration has no cache-busting; assets live in a public bucket (handled by revocation row / A-09). |
| **Depends on** | A-09 private bucket + signed URLs (shared migration with revocation row) |

Already shipped and production-proven — no rebuild. M0 riders only: add cache-busting (content-hash or version segment in the storage path, updating certificate_assets.file_url) so 'Regenerate files' actually propagates, and fold paths into the A-09 private-bucket migration. CHALLENGE: drop the JPG bullet (defer-low-value secondary) — 300-DPI PNG covers every screen/print use, JPG adds a third artifact per cert with worse quality and no requester; add later as a one-line encoder change if a real need appears.

### Social share formats + social template manager

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M5** (complexity M) |
| **Requested in** | (2) Formats — social half + (14) Social template manager |
| **Covers** | Instagram Story format · portrait post format · square post format · LinkedIn post format · dynamic vs static rendering challenge · story template management · portrait template management · square template management · LinkedIn template management · badge template management |
| **Evidence** | `src/types/database.ts:26-37 + supabase/migrations/0004_certificate_assets.sql:9-11,33-38 — asset_type enum already reserves instagram_story_png/instagram_feed_png/instagram_square_png and template_type reserves instagram_story/instagram_feed/instagram_square; storage path {certificateId}/instagram-story.png reserved (storage.ts:17)`; `certificates-email audit: 'Instagram Story PNG — absent … no renderer, no template, no UI'; docs/CERTIFICATE-OUTPUT.md:42-51 spec exists`; `production-truth: only 2 asset types exist in prod, matching code; ROADMAP records IG story blocked on client social SVG design` |
| **Gap** | Renderer, templates, admin CRUD wiring for non-official template_types, and download UI all absent; LinkedIn-post and badge types not yet in the enums; client has delivered zero social designs. |
| **Depends on** | client social designs (hard blocker); jobs outbox (M1) for batch generation; certificate_assets status columns (M0); A-09 signed-URL serving |
| **Risk of building now** | Building the renderer before designs exist guarantees rework against real artwork and burns the pre-launch window on assets nobody can download yet (no portal until M5). |

M5, explicitly blocked on client-supplied designs (decisions-brief: 'social formats (blocked on client designs)'). Reuse the exact proven pipeline: designer SVG with placeholders → template CRUD (extend the hardcoded template_type='official_certificate' at templates/actions.ts:47 into a picker) → resvg render at native pixel dims → certificate_assets row per type, generated via the M1 jobs outbox. Extend both CHECK enums with linkedin_post_png/badge_svg and linkedin_post/badge. CHALLENGE resolved: STATIC pre-rendered per-certificate assets, not dynamic — dynamic rendering re-executes template SVG per request (cost + the untrusted-SVG attack surface on a hot public path) and every consumer (IG upload, LinkedIn) wants a file anyway; regeneration via jobs covers design updates. Portrait post = instagram_feed (1080×1350) — confirm with client rather than adding a sixth near-duplicate format.

### Certificate ID scheme

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | simplify → **M5** (complexity S) |
| **Requested in** | (3) Certificate ID |
| **Covers** | readable unique non-sequential ID · series-code format (IIS-ASB-2026-8K4M72) · avoid exposing internal DB IDs |
| **Evidence** | `src/lib/certificate/issue.ts:17-21 — IIS-{year}-{4-byte-hex-uppercase}, non-sequential, collision-retried (verified in repo this session)`; `certificates-email audit: internal cert UUID appears ONLY in storage paths/asset URLs; verification uses the 48-hex token; /verify lookup uppercases and matches certificate_number`; `production-truth: 9 certificates issued under this scheme, 0 anomalies` |
| **Gap** | No series/course segment in the number; ~4.3B space per year is ample but hex mixes 0/8/B ambiguity mildly; asset URLs still leak the internal UUID (moot once A-09 makes them signed). |
| **Depends on** | courses.series_code column (M5 series metadata) |
| **Risk of building now** | Changing the ID format pre-launch churns render/verify/tests for zero user value and creates a two-format estate earlier than necessary. |

Keep the existing scheme — it already meets readable/unique/non-sequential/no-internal-ID. Adopt the series segment ONLY for newly issued certificates at M5 when series metadata exists: IIS-{series_code}-{year}-{6 chars, Crockford base32 minus ambiguous glyphs} from a new courses.series_code (e.g. ASB). Never rename existing certificates — numbers are frozen in snapshots, QRs, and printed documents; verify-by-ID must accept both shapes (it already matches on the raw column, so this is free). Do NOT build a sequence/registry table — random + unique constraint + retry is strictly simpler and already proven.

### Public verification page

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (4) Public verification page |
| **Covers** | shows name · shows title · shows issue date · shows cert ID · shows course version · shows status · shows issuer · shows expiration where applicable · shows series info · never exposes email/score/attempt history/internal notes/private profile |
| **Evidence** | `src/app/verify/[verificationToken]/page.tsx:10-123 — snapshot-only render: awarded-to, course/seminar title, event date, completion date, cert ID, topics, Valid/Revoked badge; force-dynamic; localized`; `src/lib/certification/data.ts:687-700 — explicit field selection (id/status/number/snapshot only); render.test.ts asserts no score/percent leakage; snapshot never contains email/score/notes`; `src/app/verify/actions.ts:13-44 — ID lookup rate-limited 20/min, generic not-found`; `production-truth: /verify live and healthy (200, German UI)` |
| **Gap** | Course version and series info absent (both entities don't exist yet); issuer appears as page branding + inside the certificate artwork rather than a structured field; expiration N/A by locked decision. |
| **Depends on** | A-09 signed asset URLs (M0); series/version snapshot fields (M5, needs A-06 version pin from M3) |

Ships as-is in the first release — it is the strongest surface in the domain. M0 touches are inherited, not new features: consume signed/proxied asset URLs after A-09 and keep the revoked presentation per the M0 revoked-asset decision. At M5 add issuer, series label, and course version as structured snapshot fields (written at issue for new certificates only; old snapshots stay frozen — render conditionally). 'Expiration where applicable' stays EXCLUDED per the locked never-expires decision; leave no dead UI slot for it.

### Revocation and reinstatement

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (6) Revocation |
| **Covers** | revocation reason · revoking admin recorded · effective date · internal note · optional public explanation · revocation audit event · verify page stays up showing revoked · revoked-asset download handling · reinstatement |
| **Evidence** | `src/app/(dashboard)/admin/certificates/actions.ts:35-74,144-173 — revoke stores revoked_at/revoked_by/revoke_reason + history certificate_revoked; reinstate clears all three; verify page shows REVOKED badge + rotated overlay and stays up`; `src/lib/certificate/storage.ts:12-20 + verify/[verificationToken]/page.tsx:40-55 — assets live in a PUBLIC bucket at stable URLs; overlay is page-level only, so a revoked certificate's clean official PDF/PNG remains downloadable forever by anyone with the URL (flagged weakness)`; `production-truth: 0 revocations to date; bucket confirmed public` |
| **Gap** | Revoked assets stay publicly fetchable (the A-09 driver); no optional public explanation field; effective date is implicitly revoked_at (no future-dated revocation); reason is a bare textarea with no category. |
| **Depends on** | A-09 private bucket + signed-URL endpoint (this is that work) |

M0 owns the revoked-asset handling decision (named M0 item) — implement A-09: new private bucket, certificate_assets.storage_path, short-lived signed URLs minted only for valid certificates via an authorizing endpoint; verify/candidate/admin pages switch to it; dual-read window then public-URL cutover (old emailed links die — comms note). Add public_revocation_note (nullable, rendered on verify when set) in the same M0 migration since it is one column + one conditional paragraph; categorized reason enum can wait for M5 bulk/replacement work. CHALLENGE: skip future-dated 'effective date' — revocation at click-time (revoked_at) is the honest model for a verification surface; a scheduled revocation queue is complexity without a requester.

### Certificate replacement with lineage

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M5** (complexity M) |
| **Requested in** | (7) Replacement |
| **Covers** | name correction · admin error re-issue · design update · upgrade · correction · lineage preservation |
| **Evidence** | `certificates-email audit: 'no re-render path that changes identity' — regeneration explicitly preserves number/token (participants/actions.ts:539-557); snapshot is immutable by design (render.ts docblock)`; `supabase/migrations/0001_core_schema.sql:249-251 — certificate_number plain UNIQUE and 1:1 assignment UNIQUE currently block a lineage-preserving successor row`; `production-truth: 9 certificates; any wrong-name case today would require SQL surgery` |
| **Gap** | Entirely absent. The only mutation paths are asset regeneration (identity-preserving) and revoke; a wrong name or design refresh cannot be corrected without violating snapshot immutability by hand. |
| **Depends on** | certificate state machine incl. 'replaced' status (M0); partial-unique migration on certificate_number and certification_assignment_id; jobs outbox for re-render (M1) |
| **Risk of building now** | Touches the two hardest invariants in the schema (number uniqueness, 1:1 assignment) — doing it before the M0 state machine and observability land means debugging identity changes blind. |

M5 per the decisions-brief skeleton. Model: replacement mints a NEW certificates row (fresh verification_token, fresh snapshot/render) that RETAINS the certificate_number — the number identifies the credential, the token identifies the document; predecessor flips to status='replaced' with replaced_by_certificate_id set; verify on the old token stays up and links to the current document; verify-by-number resolves to the non-replaced row. Requires converting the number UNIQUE to a partial unique index WHERE status <> 'replaced' and relaxing the 1:1 assignment UNIQUE the same way. replacement_reason enum ('name_correction','admin_error','design_update','upgrade','other') + required note + history event certificate_replaced. Until M5, the M0 combo of revoke + manual re-pass covers emergencies at current volume (9 certs).

### Credential portal

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | post-launch → **M5** (complexity L) |
| **Requested in** | (8) Credential portal |
| **Covers** | all earned certificates list · validity display · verification links · download formats · LinkedIn metadata surface · social assets in portal · badges in portal |
| **Evidence** | `src/app/certification/[accessToken]/certificate/page.tsx:64-149 — the only participant-facing certificate surface is per-assignment via access token (one cert per token, no cross-certificate view)`; `database audit: no participants.auth_user_id, no participant RLS policies anywhere — candidate flow is 100% service-role DTOs` |
| **Gap** | No participant identity to hang a portal on; no multi-certificate view; no authenticated download surface. |
| **Depends on** | participant accounts + claim flow (A-02, M1) — hard blocker; A-09 signed-URL asset serving (M0); social formats (M5) for the assets tab; participant RLS policies (M1/M5) |
| **Risk of building now** | Without accounts there is no identity to authorize against — any portal built now would be another token-scoped page, i.e. rework, and would widen the service-role surface. |

M5 (decisions-brief: 'account-based credential portal'), hard-blocked on A-02 participant accounts (M1). Build as an authenticated page listing all certificates across the participant's assignments: status badge, verify link, per-format downloads via the A-09 signed-URL endpoint (which becomes participant-aware), LinkedIn add-to-profile button (row 'LinkedIn support'), social assets and badge once those ship. Reads should go through participant-scoped RLS policies (certificates joined via assignments→participant.auth_user_id) rather than widening the service-role DTO layer. The tokenized per-assignment certificate page remains as the unauthenticated fallback — do not remove it.

### LinkedIn credential support

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M5** (complexity S) |
| **Requested in** | (9) LinkedIn support |
| **Covers** | credential name · issuing organization · issue date field · expiration field · credential ID field · credential URL · share copy |
| **Evidence** | `src/lib/certification/data.ts:101-113 — CertificateSnapshot already carries every needed field: course_title (name), completion_date (issue date), certificate_number (ID), verification_url (URL); issuer constant 'INVEST IN STRENGTH' in templates.ts:506`; `No add-to-profile link, metadata block, or share copy exists anywhere (audit: absent)` |
| **Gap** | Pure presentation gap — a prefilled LinkedIn Add-to-Profile URL plus a copyable metadata block; nothing schema-side missing. |
| **Depends on** | client confirmation of LinkedIn company page / organization ID |
| **Risk of building now** | Negligible — only risk is placing share UI on the token page before the portal exists and then moving it; acceptable. |

M5, but note it is the cheapest high-value item in this domain (an afternoon): build the LinkedIn Add-to-Profile deep link (name, organizationName='Invest in Strength' or org ID if a company page exists — ask client, issueYear/issueMonth from completion_date, certId=certificate_number, certUrl=verification_url) + a copy-paste metadata card + localized share copy, surfaced on the candidate certificate page immediately and on the portal at M5. Expiration fields intentionally omitted (never-expires lock) — LinkedIn treats absent expiry as 'no expiration', which is correct. Could be pulled into the launch boundary as a marketing sweetener if the client wants it; flag as a cheap pull-forward candidate.

### Website badge

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M5** (complexity M) |
| **Requested in** | (10) Website badge + badge bullet from (2) |
| **Covers** | website badge format · downloadable badge · embeddable badge · verification-linked badge · versioned badge · badge revocation behavior |
| **Evidence** | `No badge asset type, template type, renderer, or embed route exists (asset_type enum ends at instagram variants — src/types/database.ts:26-31)` |
| **Gap** | Entirely absent; needs a badge design, a small rendered asset, and a revocation-aware serving decision. |
| **Depends on** | client badge design; A-09 authorizing asset endpoint (M0); social template pipeline (M5) |
| **Risk of building now** | A static public badge built now would fossilize revocation-blind, permanently cacheable images — the exact weakness A-09 is scheduled to remove. |

M5-tail or M6 per the standing challenge ('post-launch, low complexity, low urgency'). SIMPLIFY the embed story: v1 = downloadable badge image (badge_svg/badge_png asset via the social pipeline) + a documented HTML snippet '<a href={verify_url}><img …></a>' — no iframe/script embed, no third-party Open-Badges spec. Revocation behavior is the one real design point: serve the badge image through the A-09 authorizing endpoint (never a frozen public file) so a revoked certificate's badge renders a greyed 'revoked' variant while the link keeps resolving to the honest verify page; that same endpoint gives 'versioned' for free (always serves current artwork). Do not build before the revocation-aware endpoint exists.

### Share and verification analytics

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | simplify → **M6** (complexity S) |
| **Requested in** | (11) Share analytics |
| **Covers** | verification page views · QR scan counts · share-button usage · badge visit counts · download counts · privacy-conscious minimalism |
| **Evidence** | `No analytics/event capture of any kind exists on verify/certificate surfaces (audit: absent); account_history is participant-action-scoped, not traffic`; `src/lib/certificate/issue.ts:126-151 — verification URL (QR target) is frozen in the snapshot, so QR-vs-direct attribution is only possible for certificates issued after a ?src=qr param is added` |
| **Gap** | Zero measurement; also zero PII risk today — greenfield. |
| **Depends on** | A-09 asset endpoint (download counting hook); admin certificate detail surface (M5 bulk/list work) |
| **Risk of building now** | Building now spends M0-critical attention on vanity metrics while the platform still cannot see its own issuance failures — observability of failures (M0) strictly outranks observability of shares. |

Per the standing challenge: minimal, privacy-conscious. Build a single aggregate table (no per-visitor rows, no IP/UA storage): certificate_stats(certificate_id, day, metric CHECK in ('verify_view','qr_scan','id_lookup','asset_download','badge_view','share_click'), count) upserted server-side from the verify page, the A-09 asset endpoint, and share buttons. QR attribution via ?src=qr appended to verification_url for NEW certificates only (frozen snapshots keep old URLs — accept the blind spot, do not rewrite snapshots). Surface as plain numbers on the admin certificate detail at M6 (analytics dashboards milestone). Explicitly no cookies, no external analytics SaaS on the public verify surface.

### Bulk certificate operations

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M5** (complexity M) |
| **Requested in** | (12) Bulk actions |
| **Covers** | issue for cohort · bulk regenerate assets · bulk resend emails · export records · revoke selected · apply new template to selection · review generation failures queue |
| **Evidence** | `src/app/(dashboard)/admin/participants/actions.ts:539-557 — per-certificate 'Regenerate files' exists (the only bulk primitive); per-cert email resend exists (certificates/actions.ts:76-142)`; `src/app/(dashboard)/admin/certificates/page.tsx — flat list, no selection model, no pagination/filters, no asset links`; `production-truth: 9 certificates — every 'bulk' need is currently satisfiable one click at a time` |
| **Gap** | No multi-select, no queue view, no export, no cohort concept; synchronous per-item actions would time out if naively looped over large selections. |
| **Depends on** | jobs outbox (M1) — hard dependency; admin list pagination/search/filters (M1); asset state machine (M0); cohorts entity (client-decision) for cohort-issue only |
| **Risk of building now** | At 9 certificates bulk tooling is pure overhead; without the jobs table any bulk loop is a serverless-timeout incident waiting to happen. |

M5 ('bulk operations'), built ON the M1 jobs outbox: every bulk action = enqueue N idempotent jobs (regenerate, send_email, apply-template-then-regenerate) + a progress/failure view — never a synchronous loop in a server action. 'Review generation failures' becomes trivial once M0 asset states exist (filter assets_status='failed'); pull a minimal single-list version of that filter into M0 since the states land there anyway. Export = CSV of certificates+status+snapshot fields (also feeds M6 GDPR/compliance exports — coordinate with admin-ops domain). 'Issue for cohort' is gated: cohorts are a client decision (schema keeps nullable cohort_id ready per brief); until then 'issue for selection of passed assignments' covers the real need. Bulk revoke ships last — it is the most dangerous button and needs a confirm-with-reason flow.

### Certificate template manager (official artwork)

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | simplify → **M5** (complexity M) |
| **Requested in** | (13) Certificate template manager |
| **Covers** | background · logo · typography · name placement · title placement · date element · ID element · signature · seal · quality badge · QR element · series label · course-specific graphic · body-part illustration · Advanced Joint Rehabilitation Series support · replaceable anatomy graphics · parametric editor vs SVG pipeline challenge |
| **Evidence** | `src/app/(dashboard)/admin/settings/templates/actions.ts:29-146 + template-import.ts:25-124 — full CRUD with normalize/sanitize/validate (QR unwrap, active-content stripping, outlined-text + external-ref rejection, placeholder requirements); dual security layers (write-time sanitizer + <img> data-URI isolation) are a locked decision`; `scripts/{update-certificate-template,import-certificate-template,rebuild-outlined-template}.mjs — proven designer-SVG intake incl. geometric rebuild of fully-outlined exports and bitmap inlining (the anatomy-photo path: Shoulder-Biomechanics template shipped this way)`; `production-truth: 1 custom template live, pinned by the seminar; per-course template picker exists (course-form.tsx:138-145); resolution chain questionnaire→course→built-in (issue.ts:105-115)`; `Known gaps in audit: no admin preview-with-sample-data, no name-overflow warning (long names overflow the seminar name slot — open ROADMAP gap), questionnaires.certificate_template_id honored but has NO admin UI, assigned-but-deactivated template silently falls back to built-in at issue` |
| **Gap** | Every visual element in the target list is already expressible as designer SVG + placeholders; what is missing is safety tooling (preview, overflow warnings), the {{series_label}} placeholder, the questionnaire-pin UI, and a warning on deactivating an in-use template. |
| **Depends on** | courses.series_code/series_label (M5) for the series placeholder; none otherwise — pipeline is live |
| **Risk of building now** | A parametric editor started now would stall the working designer pipeline for weeks and re-open the untrusted-SVG security surface that took two locked defense layers to close. |

CHALLENGE ANSWERED: do NOT build a parametric editor. The designer-SVG-with-placeholders model already delivers background/logo/typography/signature/seal/badge/anatomy graphics as artwork and name/title/date/ID/QR as placeholders; every certificate to date shipped through it, and a parametric layout engine would be XL effort that fights the designer's Illustrator workflow. The Advanced Joint Rehabilitation Series = one template per body part imported via the existing scripts — exactly what the pipeline was built for; 'replaceable anatomy graphics' = upload a new template version, which the M5 replacement/regeneration path then applies. Concrete M5 work: admin preview-with-sample-data (render current template with dummy long-name data), name/title overflow warning at template save AND at issue time, add {{series_label}} to KNOWN_PLACEHOLDERS, expose or remove the questionnaire-level pin (recommend a small select in the questionnaire form — removing the resolution slot breaks the locked chain), and warn on deactivating a referenced template. Pull the name-overflow warning forward into M0 as a live-defect guard (documented open gap, certificate_display_name is today's only escape hatch).


## Commerce & access

### Course commercial offering + Stripe Checkout (one-time payments)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity L) |
| **Requested in** | commerce#1 |
| **Covers** | price per course · currency · Stripe product/price mapping · tax config · availability flag · enrollment start/end window · access duration setting · terms version (frozen onto order at purchase) · success message · refund policy reference · one-time payments first (no subscriptions) |
| **Evidence** | `docs-truth.md §7: case-insensitive grep for stripe/payment/checkout/commerce/billing/subscription/price across the entire repo → zero matches (re-verified live this session)`; `auth-security.md 'Webhook signature validation — absent': no route handlers at all (glob src/app/api/** empty; re-verified: no route.ts anywhere)`; `database.md 'Target-LMS entities — absent': orders/payments/products/prices/coupons entirely missing from the 17-table schema` |
| **Gap** | Everything: no offer/pricing schema, no Stripe SDK, no checkout session creation, no sales-page purchase surface, no tax handling, no terms-consent capture. Also no legal checkout prerequisites (German digital-goods withdrawal-waiver consent, AGB versioning). |
| **Depends on** | M1 enrollments+entitlements (A-03); M2 webhook receiver + stripe_events (this domain); M1 orders table (manual-payments row); M0 observability (A-10) — checkout failures must be visible; Stripe account + keys in the client-owned Vercel account (production-truth: prod env unverifiable from repo); professional-review: tax/VAT + AGB/Widerruf setup |

Build in M2 exactly per A-04: new course_offers table (one active offer per course), server action creating a Stripe Checkout Session from the offer, success page that shows a friendly message but NEVER grants access (grant comes from the webhook → entitlement). Use Stripe Tax for tax config rather than building tax logic (secondary: professional-review for Kleinunternehmer/USt setup, Widerruf waiver checkbox wording, refund-policy/AGB text — flagged in decisions-brief register). Single currency EUR v1 (simplify). Note D-01: M2 vs M3 order is the client's call; if M3 goes first this row stays in the first-release boundary but ships second.

### Stripe payment flow, verified webhook receiver + event pipeline

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity L) |
| **Requested in** | commerce#2 + commerce#3 |
| **Covers** | core principle: Stripe confirms payment, entitlements control access · never gate access via redirects/success pages/client results/query params · server-side verified confirmation only · flow: course page → Checkout Session → payment → verified webhook → order updated → entitlement created → access granted · webhook signature validation · webhook idempotency · duplicate/delayed/out-of-order event handling · failed delivery detection · manual replay · test/prod isolation · event retention · alerting on webhook failure |
| **Evidence** | `ops-testing.md 'API route handlers — absent': zero route.ts in src/app (82 files enumerated) — this webhook is the app's FIRST API route`; `ops-testing.md 'Observability — absent': zero console.* in src, no Sentry, no logger — 'alerting on failed webhook delivery' is impossible in today's codebase`; `ops-testing.md 'Scheduled/background jobs — absent': no vercel.json, no cron target for reconciliation/replay`; `auth-security.md: CSRF/mutation surface is 100% Server Actions today; route-handler security patterns (raw-body signature check) have no precedent in the repo` |
| **Gap** | The entire receiving layer is greenfield: no route handler convention, no raw-body handling, no signature verification, no idempotency store, no event log, no replay tooling, and — critically — no way to know a webhook failed (zero logging/alerting today). |
| **Depends on** | M0 Sentry + structured logging + /api/health (A-10); M1 jobs/outbox + cron drainer (A-05) for retries and reconciliation; orders + entitlements tables (M1 rows below); STRIPE_WEBHOOK_SECRET/keys provisioned in client-owned Vercel account |

Build in M2 per A-04, and treat A-04's access principle as a non-negotiable acceptance criterion: the success URL renders copy only; entitlement creation happens exclusively in the webhook handler (with checkout.session.completed → order paid → entitlement active, all state-machine-guarded so duplicates and out-of-order events are no-ops). Insert-first into stripe_events with ON CONFLICT DO NOTHING for idempotency; store livemode and reject env mismatch for test/prod isolation; admin 'reprocess event' action for manual replay; nightly reconciliation cron (see gating row) catches missed/failed deliveries; Sentry alert on processing_status=failed. Do NOT start this before M0 lands observability — a silent webhook failure is silent revenue loss.

### Orders + payment records: state machine and stored Stripe references

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | commerce#4 + commerce#5 |
| **Covers** | order states: draft · order states: checkout created · order states: pending · order states: paid · order states: failed · order states: cancelled · order states: refunded · order states: partially refunded · order states: disputed · order states: manually paid · stored Stripe customer ID · stored checkout session ID · stored payment-intent ID · stored charge ID · stored refund IDs · stored dispute IDs · stored event IDs · amount · currency · status · coupon snapshot · promo code snapshot · refund status · dispute status · never card details |
| **Evidence** | `database.md: schema patterns for exactly this shape exist and are proven — text+CHECK enums, explicit status + corroborating timestamps (certification_assignments, certificates), unique human-readable numbers (certificate_number), append-only audit, admins_all RLS`; `database.md 'Target-LMS entities — absent': no orders/payments tables today`; `production-truth.md: data volumes tiny — additive migration + backfill is trivial` |
| **Gap** | Table, state machine, immutability guards, and admin order list/detail UI all missing; also the account_history vocabulary has no financial events. |
| **Depends on** | participants table (exists); courses/course_offers reference; M1 generalized audit-log decision (decisions-brief M1) for financial events |

Create the FULL orders schema in M1 (all states + nullable Stripe columns) so manual payments write real orders immediately and M2 only wires Stripe transitions — avoids a second structural migration. Model 'manually paid' as status='paid' + payment_method≠'stripe' (one state machine, method column carries the how) — this is a deliberate normalization of the scope vocabulary, say so in admin UI labels instead. Follow A-08: forward-only transition trigger + freeze financial fields after paid (guard_* trigger pattern already exists for questionnaires). Store only Stripe IDs — never card data (Stripe holds PAN; we hold references). Child refunds table for partial-refund arithmetic.

### Entitlements — the authoritative access record (state machine)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity L) |
| **Requested in** | commerce#6 |
| **Covers** | entitlement = authoritative access record · state: pending · state: active · state: expiring · state: expired · state: revoked · state: refunded · state: suspended · state: disputed · state: complimentary · state: manually paid |
| **Evidence** | `database.md 'Target-LMS entities — absent': enrollments/entitlements/licenses fully absent; today 'assignment ≈ enrollment only at questionnaire granularity'`; `production-truth.md: 17 participants / 20 assignments — backfilling enrollments+entitlements for all existing participants is an instant, safe migration`; `database.md: partial-unique-index and status+timestamp patterns (uniq_active_assignment_per_questionnaire) are the exact template for one-live-entitlement-per-enrollment` |
| **Gap** | The platform's future access model has no home: access today = permanent assignment token, with no expiry, no suspension, no source tracking. Nothing separates 'is registered' from 'may access' from 'may take the exam'. |
| **Depends on** | M1 participant accounts / claim flow (A-02) for portal-side gating (token exam flow works without it); orders table for source='order' linkage (same milestone); cross-domain schema agreement with Learning (M3 consumes entitlements) and Identity domains |

Build in M1 exactly per A-03: enrollments (registration fact) + entitlements (access state machine), assignments gain nullable enrollment_id, never collapse the three. IMPORTANT normalization vs the scope list: keep A-03's six states (pending/active/expiring/expired/revoked/suspended) and model the scope's 'refunded'/'disputed' as status_reason on revoked/suspended, and 'complimentary'/'manually paid' as source values (order/manual/complimentary/invitation) — ten orthogonal 'states' would produce an unmaintainable matrix; the decisions-brief vocabulary wins. Backfill: one enrollment + one perpetual complimentary entitlement per existing participant×course so gating can turn on without breaking anyone. Admin UI: entitlement list + detail + manual grant/revoke/extend in M1.

### Manual payment recording (offline payments as real orders)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | commerce#7 |
| **Covers** | manual payment creates a real order · field: participant · field: course · field: cohort · field: amount · field: currency · field: method · field: reference · field: date · field: recording admin · field: note · field: access duration · field: receipt · audit trail · method: bank transfer · method: invoice · method: cash · method: partner · method: complimentary |
| **Evidence** | `docs-truth.md §7: zero payment functionality or plans anywhere in repo/docs`; `auth-security.md: the admin action pattern this needs (requireAdmin + Zod + FormState + account_history event with created_by_admin_id) is proven across all 36 existing admin actions` |
| **Gap** | No way to record that someone paid by bank transfer/invoice/cash today — the client currently has no revenue records in the system at all. |
| **Depends on** | orders table (same milestone); enrollments + entitlements (same milestone) |

Build in M1 per decisions-brief (this is the revenue bridge while M2 vs M3 is decided — D-01). Admin form: participant + course + amount/currency + method (bank_transfer/invoice/cash/partner/complimentary) + reference + paid date + note + optional access-duration override → creates order (status=paid, method set, recorded_by_admin_id) → creates enrollment + active entitlement in the same flow. cohort field: nullable cohort_id only, per standing client-decision on cohorts — no cohort UI until confirmed. receipt: v1 = free-text receipt/invoice reference field only; generated receipts/invoices are professional-review (invoicing + tax register) and post-launch. complimentary is a zero-amount order with source=complimentary entitlement, keeping every access grant traceable to an order or invitation.

### Coupons / promotion codes

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | replace → **M2** (complexity S) |
| **Requested in** | commerce#8 |
| **Covers** | fixed discount · percentage discount · max redemptions · coupon expiry · course/cohort restriction · new-customer restriction · email restriction · minimum amount · campaign label · partner attribution · clarify Stripe promotion codes vs academy-side rules |
| **Gap** | Nothing exists, and per decisions-brief nothing academy-side should: Stripe natively covers fixed/percentage, max redemptions, expiry, first-time-customer, minimum amount, and product (course) restriction; customer-scoped promotion codes cover email restriction. |
| **Depends on** | Stripe Checkout integration (M2 rows above); orders table snapshot columns |
| **Risk of building now** | Building an academy-side coupon engine now would duplicate Stripe functionality, add a redemption-validation surface that must stay consistent with Stripe's own checkout math, and delay M2 for a feature the dashboard already provides. |

Replace the academy coupon engine with Stripe promotion codes v1 (standing disposition, confirmed A-04): enable allow_promotion_codes on Checkout Sessions and manage codes in the Stripe dashboard — zero engine code. Academy-side keeps only attribution snapshots on the order (coupon/promo IDs + code string + discount_cents + campaign_label + partner_source, entered as checkout metadata or invitation fields) so revenue reporting works without calling Stripe. Cohort restriction: client-decision (cohorts themselves are), and unsupported by Stripe — if ever needed, route it through invitation links instead of a coupon engine. Re-evaluate an academy engine only if the client outgrows Stripe's restriction model post-launch.

### Private invitation links (signed, expiring invitation entity)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | commerce#9 |
| **Covers** | invitation → course · invitation → course version · invitation → cohort · invitation → specific email · grant: free access · grant: discount · grant: fixed price · access duration override · expiration · max uses · partner source · label · required account state · tokens signed + non-guessable · revocable · auditable · evaluate today's permanent raw access_token invite emails against this |
| **Evidence** | `auth-security.md 'Signed/expiring invitation tokens — absent': invite emails embed the raw permanent access_token URL; 'the emailed link IS the credential, forever' (src/app/(dashboard)/admin/participants/actions.ts:68-74; src/lib/public-url.ts:11-13)`; `auth-security.md 'Participant access-token model — reliable': what DOES exist is strong — 192-bit tokens (0001_core_schema.sql:176), constant-shape null on probe, revocable via toggleAssignmentActive + regenerateAccessLink with account_history events (participants/actions.ts:357-424)`; `auth-security.md weakness: 'Candidate access tokens never expire' — for passed assignments the link permanently exposes the result page` |
| **Gap** | Today's 'invite' is the exam credential itself: non-guessable, revocable and audited (good), but permanent, unsigned, single-purpose, and carrying zero commercial semantics (no course/price/duration/uses/expiry). No invitation entity exists. |
| **Depends on** | enrollments + entitlements (same milestone); M1 participant accounts (A-02) for account-state conditions (deferred sub-item); M2 Stripe checkout for discount/fixed-price grant types (deferred sub-items) |

Build the invitations entity in M1 per decisions-brief ('signed expiring invitations entity'). v1 grant_type='free' only: redeeming creates enrollment + complimentary/invitation-source entitlement (and a zero-amount order for reporting); discount/fixed-price grants land with M2 by mapping to a Stripe promotion code or a dedicated Stripe price on the Checkout Session — don't build price math academy-side. Token: 192-bit random, stored hashed (email_verification_codes pattern) — this satisfies 'signed + non-guessable' without introducing a JWT layer; add HMAC only if links must be verifiable offline (they don't). Expiry + max_uses + revoked_at + redemptions child table + audit events. cohort and required_account_state: schema-ready nullable columns, UI deferred (cohorts = client-decision; account-state gating needs A-02 accounts, simplify to 'email must match' v1). Keep the assignment access_token as the separate exam-ticket credential it is — the invitation replaces the invite email's role, not the exam token; also adopt the audit's mitigation of expiring/rotating assignment links as part of M1 hardening.

### Access expiry + duration management (separate from certificate validity)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity M) |
| **Requested in** | commerce#10 |
| **Covers** | access expiry separate from certificate validity · default: course access 12 months · default: portal access persistent · default: certificate permanent · reminder emails 30/7/1 days before expiry · expired notice · admin extend · admin renew · admin revoke · admin pause · admin restore |
| **Evidence** | `auth-security.md: 'No expiry mechanism exists' for any access today (access tokens permanent)`; `database.md: certificates have no expiry fields 'by design: never expires' — matches the 'certificate permanent' default and the locked decision`; `ops-testing.md: no cron target and no email-events feedback loop exist — reminders have no infrastructure today` |
| **Gap** | No time dimension anywhere in the access model, no scheduled sweep to expire anything, no reminder mechanism, and no admin lifecycle controls (extend/pause/etc.). |
| **Depends on** | entitlements (M1); M1 jobs/outbox + Vercel Cron (A-05); M1 email_events + Resend webhook (A-05); gating helper (M1 row below) |

Build in M2 per decisions-brief ('access expiry + reminders'). Expiry lives on entitlements.expires_at (NULL = perpetual), default = course_offers.access_duration_days (365) applied at activation; portal/account access and certificate validity are untouched (certificate permanence is a locked decision — excluded from expiry by design, do not revisit). Enforcement is read-time (expires_at comparison in the gating helper — never trust status alone); the daily cron only flips active→expiring (T-30d)→expired for reporting and enqueues reminder jobs at 30/7/1 + an expired notice, deduped via email_events. Admin controls on the entitlement detail: extend (push expires_at), renew (new entitlement row, optionally tied to a new order), revoke, pause/restore (suspended + stored remaining duration). Reminders depend hard on A-05 jobs + Resend webhook truth from M1 — without email_events, 'reminder sent' would repeat today's emailed_at≠delivered blind spot.

### Refund handling (access + credential policy)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity M) |
| **Requested in** | commerce#11 |
| **Covers** | refund before certificate → full refund revokes access · refund after certificate → do NOT auto-revoke credential · post-certificate refund creates an admin review state |
| **Evidence** | `database.md/auth-security.md: no orders/refunds schema, no webhook receiver to observe charge.refunded`; `production-truth.md: certificates.status revoked-count is 0 in prod and revocation exists — the credential-side machinery (revoke with reason, audit) already works and must NOT be auto-triggered by refunds` |
| **Gap** | No refund representation, no Stripe refund event ingestion, no policy wiring between money-state and access-state, no admin review surface. |
| **Depends on** | webhook pipeline + stripe_events (M2); orders + refunds tables (M1/M2); entitlements (M1); professional-review: Widerruf/consumer-withdrawal policy defines when refunds are legally owed |

Build in M2 as part of the webhook pipeline: charge.refunded / refund events → refunds child rows → order refund arithmetic (partial vs full). Policy engine is deliberately simple and explicit: full refund + no certificate issued on the enrollment → entitlement revoked (status_reason=refund), access gone next request; any refund where a certificate EXISTS → entitlement revoked/suspended per admin choice but certificate untouched, and an admin review flag is set (needs_review + reason on the order, surfaced in an admin queue list) — never auto-revoke a credential for a money event, matching the locked certificate-integrity ethos. Keep the review mechanism minimal (flag + filtered admin list), shared with disputes — not a ticketing system (that's M6 territory, standing simplify). Admin-initiated refunds v1: perform the refund in the Stripe dashboard and let the webhook drive our state — no in-app refund button until post-launch (simplify).

### Dispute (chargeback) handling

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity M) |
| **Requested in** | commerce#12 |
| **Covers** | suspend access on dispute · flag order as disputed · notify admins · preserve learning/assessment/certificate records · create review task · never delete participant data during disputes |
| **Evidence** | `ops-testing.md: 'Nobody is paged, ever' — admin notification infrastructure is absent, so 'notify admins' has no substrate today`; `database.md: snapshot-heavy design (attempt_snapshot, certificate_public_snapshot, append-only account_history) already preserves assessment/certificate records — the preservation requirement is largely satisfied by existing architecture` |
| **Gap** | No dispute ingestion (charge.dispute.* events), no disputed order state, no suspension wiring, no admin alerting channel, no review queue. |
| **Depends on** | webhook pipeline (M2); orders + disputes tables; entitlements suspension (M1); M1 jobs/outbox for admin notification emails; M0 observability for the alert path |

Build in M2 with the webhook pipeline: charge.dispute.created → disputes row + order.status=disputed + entitlement suspended (status_reason=dispute, reversible) + admin notification email via the jobs queue + needs_review flag in the same minimal review queue as refunds; dispute closed events resolve to won (restore entitlement) or lost (revoke, reason=dispute). Records preservation: rely on the existing snapshot/append-only architecture and make new financial tables participant-RESTRICT (never CASCADE) so no path can delete a disputed participant's data — this also dodges the documented account_history CASCADE/trigger collision. Never delete participant data is an invariant to encode in FK choices, not a feature.

### Entitlement-based gating, lookup + reconciliation

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | commerce#13 |
| **Covers** | every protected request resolves via internal entitlements · never call Stripe per request · entitlement lookup helper · caching strategy · revocation timing · expiry enforcement · admin override · webhook-driven reconciliation · scheduled reconciliation · failure behavior (fail-closed) |
| **Evidence** | `auth-security.md: today's only access gates are requireAdmin() and the assignment access_token + email-OTP — no participant-facing authorization layer exists`; `auth-security.md/ops-testing.md: i18n reads use React cache() per-request memoization over service-role — the exact caching pattern the lookup helper should copy (src/lib/i18n/index.ts)`; `production-truth.md: tiny volumes (17 participants) — no cross-request cache needed at launch; a single indexed query per request is fine` |
| **Gap** | No lookup function, no enforcement call sites (the surfaces it protects — portal, lessons — arrive in M1/M3), no reconciliation of any kind, and no defined failure behavior (today's idiom is fail-soft/silent, which is exactly wrong for access control). |
| **Depends on** | entitlements table (M1); M1 participant accounts (A-02) for portal surfaces; M3 learning surfaces are the main consumers (cross-domain contract); M2 stripe_events + cron for the reconciliation half; M0 error boundaries + Sentry for fail-closed behavior |

Build the helper in M1 alongside entitlements: getActiveEntitlement(participantId, courseId) in src/lib/access/, predicate = status IN ('active','expiring') AND (expires_at IS NULL OR expires_at > now()) — expiry enforced at read time so revocation and expiry take effect on the next request with zero cache invalidation machinery. Caching: React cache() per-request only at launch (copy the i18n pattern); no Redis/edge cache until volume demands it; Stripe is NEVER consulted at request time (A-04). Failure behavior: fail-closed for content access with a friendly error page + Sentry event — explicitly break from the codebase's documented silent-fallback idiom here. Admin override = manual/complimentary entitlement rows (auditable), not a bypass flag. Reconciliation lands in M2: webhook is the primary driver; nightly cron sweeps (a) stale checkout_created/pending orders vs Stripe API, (b) paid orders lacking an active entitlement → repair + alert, (c) failed stripe_events → alert, (d) expiry/reminder transitions. The tokenized exam flow keeps its own access rules (token + OTP) with assignment→enrollment_id linkage added; do not retrofit entitlement checks into the exam surface in M1.


## Production safety, reliability & security

### Attempt state machine & exam-integrity guards (DB-enforced)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (1) state machines: attempts; (12) exam integrity; M0 repair: attempt-race guards |
| **Covers** | Explicit open/submitted attempt state instead of ambiguous nullable submitted_at · DB partial unique index: at most one open attempt per assignment · Immutability trigger on submitted attempts + attempt_answers (currently freely mutable/deletable under admins_all RLS) · Assignment fail-path gets the same .neq('passed') guard as the pass path (A-08) · attempts.language freeze and courses.kind immutability promoted from app convention to DB guard · Exam integrity: server-side grading against DB-loaded options only (already correct — preserve with regression tests) · Coherence CHECKs: submitted_at set => passed/score/correct_count set |
| **Evidence** | `database.md: no partial unique index WHERE submitted_at IS NULL exists (verified again this session via grep of supabase/migrations — zero matches); uniqueness only on (assignment, attempt_number) (0001:222)`; `database.md: submitted attempts fully mutable/deletable under admins_all RLS unlike account_history (0001:581-584); language freeze app-only (0002:44-47); kind immutability app-only (0007:21-23)`; `auth-security.md: grading only against DB-loaded questions/options, submitted orders filtered against DB ids (certification/[accessToken]/actions.ts:242-329) — the integrity core is sound`; `production-truth.md: 0 assignments with >1 open attempt today — invariants clean, so guards can be added with no data repair` |
| **Gap** | The states exist behaviorally but nothing in the DB prevents two concurrent open attempts, post-submit rewriting of scores/answers by any admin session, or a kind/language flip; the resume/hydrate logic assumes a single in-progress attempt that only app luck guarantees. |

M0 per A-08: one small migration — partial unique index uniq_open_attempt_per_assignment ON attempts(certification_assignment_id) WHERE submitted_at IS NULL; BEFORE UPDATE/DELETE trigger raising on any grading-field change once submitted_at IS NOT NULL (with an explicit column whitelist so M4's planned invalidation fields can be added without weakening it); CHECK constraints; app-side .neq('passed') guard on the fail path. Data is tiny and clean — backfill risk zero. Keep the existing scoring path untouched.

### Certificate issuance & asset-generation state machine + admin issue-retry

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (1) state machines: certificates, certificate generation; M0 repair: cert issue-retry |
| **Covers** | Explicit certificate asset state (pending_assets/complete/failed + error detail) instead of certificate_assets row-existence-as-state · Admin re-issue path for a passed assignment whose certificates INSERT failed (today: stranded forever, manualPass refuses, no button exists) · Check and log every step of the non-transactional issuance sequence (answers insert, status update, certificate_id backlink, history insert are all unchecked today) · Admin UI distinguishes 'assets generating' from 'generation failed' and shows why · Fix 23505 retry-loop conflation: concurrent double-submit burns 3 retries on the assignment-uniqueness constraint instead of fetching the winner's row · Move inline 300-DPI resvg render + uploads off the candidate submit request (onto jobs once M1 lands; M0 keeps it inline but stateful and logged) |
| **Evidence** | `certificates-email.md: issue.ts:167-169 returns null unlogged on non-23505 insert error; issue.ts:172-184 certificate_id backlink + history unchecked; no surface ever re-invokes issueCertificate (assignments-section.tsx:307-313 static 'certificate pending')`; `certificates-email.md: generate.ts:118-131 failure logged to account_history only when participantId resolved; AssetGenerationResult.error discarded by both callers (issue.ts:189, participants/actions.ts:555)`; `ops-testing.md: 300-DPI resvg + pdf-lib + 2 Storage uploads awaited inline in the candidate submit request — most likely OOM/timeout point, zero telemetry (assets.ts:20,84-100)`; `production-truth.md: 9/9 certificates have both assets and 0 passed-without-certificate — no live strandings yet, so this is a latent, not active, defect` |
| **Gap** | Issuance is a best-effort sequence whose failure modes are invisible and unrecoverable: a transient DB error after status='passed' permanently strands the candidate with no admin remediation short of SQL surgery; 'pending' and 'failed' assets are indistinguishable. |
| **Depends on** | jobs/outbox (M1) for taking generation off the request path — interim inline-but-stateful is acceptable |

M0 per A-08: add certificates.asset_status ('pending','complete','failed') + asset_error + asset_attempted_at (backfill 'complete' for the 9 existing certs); add an admin 'Issue certificate' action for passed-without-certificate assignments (idempotent, reuses issueCertificate); check every write result and log to Sentry + history; make the retry loop fetch the existing row on assignment-unique collision. Defer the off-request move to M1 jobs (secondary: combine with the jobs row) — don't build a one-off queue in M0.

### Commerce state machines: orders, payments, entitlements

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity L) |
| **Requested in** | (1) state machines: orders, payments, entitlements |
| **Covers** | orders state machine (pending_payment/paid/payment_failed/canceled/refunded/partially_refunded) with method stripe/manual/complimentary · payments state machine tied to Stripe payment intents (pending/succeeded/failed/refunded/disputed) + refunds records · entitlements state machine (pending/active/expiring/expired/revoked/suspended) + source order/manual/complimentary/invitation (A-03) · Manual payments create real orders (method=manual) — no side-channel access grants · No nullable-timestamp-only state on any commerce table; transitions only via helpers that also write audit rows |
| **Evidence** | `database.md: orders/payments/products/coupons/entitlements entirely absent from the 17-table schema`; `database.md: text+CHECK enum house pattern and RLS-on-every-table pattern established in 0001 — new state tables drop straight in`; `production-truth.md: 17 participants — backfill/migration cost of introducing these tables is nil` |
| **Gap** | Fully greenfield; the risk is not building it but building it with the same nullable-timestamp/implicit-state habits the existing schema shows (attempts, email_verification_codes). |
| **Depends on** | A-03 enrollments/entitlements schema (M1); Stripe integration (M2) for card-payment states; jobs/outbox (M1) for expiry transitions |

Entitlements + manual-payment orders land in M1 (they are the access foundation and the bridge revenue path); Stripe payment/refund/dispute states extend the same tables in M2. Every table gets an explicit status column with CHECK, a transitions helper, and audit_log writes — enforce via the migration-review checklist from the conceptual-separation row. 'expiring'/'expired' flips happen only in the reconciliation job, never as a side effect of reads.

### Background jobs (outbox) + email delivery state machines

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity L) |
| **Requested in** | (1) state machines: email delivery, background jobs; A-05 |
| **Covers** | jobs table with explicit states queued/running/succeeded/failed/dead + attempts + last_error + run_after · Vercel Cron drainer route + on-demand trigger after enqueue (the app's cron target — none exists today) · Move certificate asset generation and all email sends onto jobs (retry + visibility) · email_events table fed by a Resend webhook receiver — delivery/bounce truth (today emailed_at is stamped on a Resend 200 and bounces are recorded as success) · Email retries with backoff (today: one-shot per click, errors swallowed, resendInvite gives zero feedback) |
| **Evidence** | `ops-testing.md: zero route.ts anywhere in src/app (82 files) — no cron target, no webhook receiver possible today`; `ops-testing.md: emailed_at + 'Certificate emailed' history written immediately after a 200 from Resend (certificates/actions.ts:119-134); bounced mail is invisible`; `certificates-email.md: all three send wrappers catch everything, discard the Resend error, no retry (certificate-email.ts:49-55, invite-email.ts:42-48); resendInvite is a silent void action (participants/actions.ts:426-468)`; `production-truth.md: 4 of 9 certificates have emailed_at set; Resend suppression/bounce state unverifiable — no webhook receiver exists` |
| **Gap** | All heavy/fallible work is request-scoped and fire-and-forget; there is no durable record of what was attempted, no retry, and provider-side delivery truth never reaches the system. |
| **Depends on** | /api route layer (first routes land in M0 with health check); observability (M0) for job-failure visibility |

M1 per A-05: Postgres outbox `jobs` table + Vercel Cron drainer, no queue SaaS; Resend webhook receiver (signature-verified) writing email_events; migrate the three existing senders and asset generation onto it. This is shared foundation for reconciliation, alerting, and commerce — build it once, early in M1.

### Import pipeline state machine (CSV/bulk imports)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | defer-low-value → **M6** (complexity M) |
| **Requested in** | (1) state machines: imports |
| **Covers** | import_batches state machine (uploaded/validating/validated/applying/applied/failed) + per-row results · No silent partial imports; validate-then-apply as separate explicit steps |
| **Evidence** | `production-truth.md: 17 participants total in production — manual enrollment covers current volume many times over` |
| **Gap** | No import feature exists at all; if ever built it must be stateful from day one, but nothing today needs it. |
| **Depends on** | jobs/outbox (M1); enrollments/entitlements (M1) |
| **Risk of building now** | Building an import pipeline for a 17-participant academy is pure speculative surface that adds real failure modes (partial imports, duplicate participants) with no current user. |

Standing disposition from the decisions brief: defer. If cohort sales ever create real bulk-onboarding volume, build it on the jobs table with the two-phase validate/apply state machine sketched in the data model — never as a synchronous server action.

### Observability core: error tracking, structured logging, error boundaries

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (2) observability/monitoring; A-10 |
| **Covers** | Sentry (or equivalent) + instrumentation.ts · Structured logging at every catch site (today the error object is discarded at literally every one) · error.tsx / global-error.tsx boundaries (none exist — candidates hit Next's default error screen mid-exam) · Coverage targets as features exist: app errors, auth failures, authz failures, DB errors, webhook failures/backlog, cert-generation failures, storage failures, email failures, job failures, progress-write failures, gating failures, excessive exam-submit failures, import failures |
| **Evidence** | `ops-testing.md: grep 'console\.' across src — zero matches; no logger, no Sentry/posthog/instrumentation.ts, no error.tsx anywhere (glob confirmed)`; `ops-testing.md: sole durable failure record in the whole system is account_history 'certificate_generation_failed' (generate.ts:120-129)`; `ops-testing.md: recordAttempt throws bare 'Failed to record attempt' (data.ts:369-371) with no catch, no boundary, no log — a DB blip mid-submit is invisible and undiagnosable` |
| **Gap** | The team would learn about a production incident from a user, not from the system; nothing emitted, nothing captured, nothing to grep after the fact. |

M0, first thing, before any behavior change: Sentry SDK + instrumentation.ts, a thin logger, error boundaries with a support-reference ID, and a hard project rule 'every catch site logs with context'. Webhook/job/import/gating classes are instrumented as those features are built (M1+) under the same rule — the row's later items are a contract, not M0 work.

### User-visible failure states (participant + admin), no fake success

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (3) user-visible failure states |
| **Covers** | Participant-facing failure message with a retry path and support reference · Admin-facing status for failed operations (checked write results, error surfaced) · Support reference ID shown on errors and correlated with logged context · No success UI before authoritative backend success — eliminate fire-and-forget void actions · submitAttempt failure path: caught, logged, candidate sees a recoverable state (attempt survives, answers persisted) |
| **Evidence** | `ops-testing.md: toggleCourseActive (courses/actions.ts:151-160), reinstateCertificate (certificates/actions.ts:144-173), regenerateCertificateAssets (participants/actions.ts:539-557) ignore DB write results entirely — page revalidates as if it succeeded`; `ops-testing.md: FormState idiom collapses every DB error to a generic localized message, error discarded (courses/actions.ts:84-86)`; `certificates-email.md: resendInvite failure looks identical to success in the UI and writes no history` |
| **Gap** | Failures either render as success (void actions) or as an unactionable generic string; no error carries a reference an admin or support person could chase. |
| **Depends on** | Observability/Sentry (M0) for support-reference correlation |

M0: convert void ActionButton actions to checked results with visible failure state; extend FormState with an optional supportRef (Sentry event id); add error boundaries per the observability row. Full participant-facing retry choreography for new flows (checkout, lessons) follows the same pattern in their own milestones.

### Health checks (/api/health shallow + deep)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (4) health checks |
| **Covers** | Shallow: web app responds · Deep: DB reachable, auth reachable, storage bucket present, email provider configured, webhook processing lag, cert-generation backlog, scheduled-jobs/queue heartbeat · First API route handler in the app (none exist today, so uptime monitoring can only fetch pages) |
| **Evidence** | `ops-testing.md: zero route handlers in src/app — a health endpoint is currently impossible and no uptime monitor can see past a page fetch`; `production-truth.md: live-site checks had to be done by fetching public pages (home 200, /verify 200)` |
| **Gap** | No machine-checkable statement of system health exists; every dependency (DB, storage, Resend, Upstash) degrades silently by design. |

M0 per A-10: /api/health with shallow mode for uptime pings and deep mode (auth-gated or token-gated) checking DB, storage bucket existence, email + Upstash env presence. Jobs-heartbeat and webhook-lag probes are added to the deep check when those subsystems land in M1/M2.

### Synthetic smoke tests (post-deploy + scheduled)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (5) synthetic smoke tests |
| **Covers** | participant sign-in (token resolves + OTP surface) · admin sign-in · purchase→webhook→access (M2) · entitlement opens course (M1/M3) · expired entitlement blocks (M2) · progress persists (M3) · quiz persists (M3) · exam persists (attempt autosave/resume) · pass→certificate workflow · verify resolves · certificate download · manual enrollment · invitation resolves · coupon applies (M2, Stripe promotion codes) · admin views participant state |
| **Evidence** | `ops-testing.md: no playwright/cypress config, no test touches an HTTP layer; all 17 test files are pure-logic under src/lib — inverted coverage profile`; `ops-testing.md: verified E2E only once manually against live infra (CLAUDE.md 2026-05-29 note) — nothing repeatable exists` |
| **Gap** | The flows most likely to break (auth, RLS, Server Action wiring, cert pipeline) have zero automated verification, and a deploy is never followed by any check. |
| **Depends on** | CI (M0); staging/test-data strategy; later flows: M1 invitations/entitlements, M2 checkout/coupons, M3 progress |

M0: Playwright suite over the flows that exist today (admin sign-in, token resolves, verify resolves, cert download via a seeded synthetic assignment; pass→cert against a staging Supabase project, not prod), wired as post-deploy gate + scheduled run. Each later milestone adds its flows as part of its definition of done. Prod-safe synthetic data (flagged test participant/course) must be excluded from reporting.

### Reconciliation sweeps (detect + surface, never silently rewrite)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M2** (complexity M) |
| **Requested in** | (6) reconciliation |
| **Covers** | Stripe events vs orders · paid orders vs entitlements · entitlements vs expiry dates · passed assessments vs certificates · certificates vs assets · queued emails vs delivery (email_events) · stuck jobs detection · Findings surfaced on an admin ops dashboard + alert, with explicit repair actions — no auto-rewrites |
| **Evidence** | `production-truth.md: the exact invariant queries were run by hand for this audit (0 passed-without-cert, 9/9 certs with both assets, 0 multi-open-attempts) — all clean; the queries just need a scheduled home`; `ops-testing.md: no cron target exists; nothing periodically checks anything` |
| **Gap** | Every cross-entity invariant is enforced only by code happening to not fail; a mid-sequence failure (documented as possible in issuance and recordAttempt) creates drift nobody would ever see. |
| **Depends on** | jobs/outbox + cron (M1); email_events (M1); orders/entitlements/stripe_events schema (M1/M2) |

Codify the production-truth invariant queries as the first reconciliation job on the M1 jobs runner (passed-vs-certs, certs-vs-assets, stuck jobs, emails-vs-events); Stripe-vs-orders and orders-vs-entitlements land with M2 per A-04. Each finding creates an alert + admin-visible item with a one-click guided repair (e.g. the issue-retry action) — reconciliation reports, humans repair.

### Alerting (actionable, low-noise)

| | |
|---|---|
| **Status** | ⛔ Missing, blocked by prerequisites |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (7) alerting |
| **Covers** | repeated webhook failures · paid-order-without-entitlement · pass-without-certificate · cert-valid-without-assets · repeated email failures · job not running (heartbeat missed) · authz-error spike · migration failure · backup failure · smoke-test failure · Routing to a channel the operator actually reads; every alert has an owner and a playbook line |
| **Evidence** | `ops-testing.md: 'Nobody is paged, ever' — no error tracking, no monitoring, no alerting of any kind`; `production-truth.md: log drains/alerting on the client Vercel account unverifiable — assume none` |
| **Gap** | Even after observability lands, alerts don't exist until rules are written; business-invariant alerts additionally need the reconciliation sweeps as their signal source. |
| **Depends on** | Sentry (M0); /api/health (M0); reconciliation + jobs heartbeat (M1/M2) for business alerts |

M0 foundation: Sentry alert rules (new issue, error-rate spike incl. authz spike), uptime monitor on /api/health, CI/smoke-failure notifications. Business-invariant alerts (pass-without-cert, paid-without-entitlement, email/webhook failure streaks, job heartbeat) are emitted by the reconciliation job and jobs runner as those land in M1/M2. Keep the total alert count small enough that each one is acted on.

### Deployment safety: CI gate, rollback discipline, maintenance mode

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (8) deployment safety; M0 repair: CI |
| **Covers** | GitHub Actions CI: typecheck + lint + the existing 171 tests, blocking before Vercel deploy · Pre-deploy checks incl. env completeness against the env schema · Migration ordering discipline: expand→migrate→contract, backward-compatible deploys (schema first, code second) · Post-deploy smoke test as release gate · Rollback criteria + observation window + roll-forward playbook (Vercel instant rollback covers code; DB uses compensation scripts) · Maintenance-mode switch for the candidate/checkout surfaces · Branch protection on main |
| **Evidence** | `ops-testing.md: no .github/, no vercel.json, no hooks — 'a change that breaks all 171 tests deploys to production unimpeded'; only gate is next build's TS check`; `production-truth.md: deploys = push to main → auto-build on the client-owned Vercel account; no CI, no vercel.json` |
| **Gap** | Zero automated gate between a keystroke and production on a platform issuing legally-meaningful certificates. |
| **Depends on** | smoke tests (M0); env schema validation (M0); feature flags (M1) for maintenance mode |

M0 per A-10: CI workflow (pnpm typecheck + lint + test) with main branch protection is a half-day and the single highest-leverage safety item; add the smoke suite as a post-deploy job; write the two-page deploy/rollback playbook. Maintenance mode = a feature-flag-checked banner/block on candidate + (later) checkout routes — build the switch in M1 with flags.

### DB migration discipline: Supabase CLI tracking + drift check

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (9) DB migrations discipline; M0 repair: Supabase CLI migrations |
| **Covers** | Supabase CLI migration tracking replacing SQL-editor pasting (baseline 0001-0007 as applied) · CI drift check between repo migrations and live schema · Migration playbook: backward compat, locking risk (negligible at current table sizes), defaults, nullability, backfill, permission changes, compensation scripts, prod verification step · No opaque mega-migrations — small single-purpose files · Dashboard-only state captured as code/docs: storage buckets, auth settings, the fact that hand-run hotfix SQL is forbidden once CLI lands |
| **Evidence** | `database.md: 0004-0006 headers say 'apply manually in the Supabase SQL editor'; no config.toml, CLI not wired; hotfix SQL (trigger disabling) invisible to the repo`; `production-truth.md: migration parity CONFIRMED live (0004-0007 all applied, PostgREST table list matches types exactly) — so baselining the CLI now is safe and cheap`; `production-truth.md: tables are tiny — backfills instant, locking risk essentially zero` |
| **Gap** | Nothing tracks what SQL actually ran in prod; the repo's parity today was established by manual probing, not tooling, and one forgotten paste away from silent divergence. |
| **Depends on** | CI (M0) |

M0: supabase link + baseline the 7 applied migrations into schema_migrations, add `supabase db diff --linked` as a CI drift check, and adopt the playbook for every migration this program will generate (there will be many in M1-M3). This is prerequisite plumbing for every other domain's schema work.

### Feature flags (temporary rollout switches)

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity S) |
| **Requested in** | (10) feature flags |
| **Covers** | Flags for: new learning UI, assessment-engine changes, cert-generation pipeline cutover, Stripe checkout, manual payments, admin tools, gating logic · Flag lifecycle rule: flags are temporary rollout devices removed after stabilization — not permanent branches · Fail-safe defaults per flag (public surfaces must have a defined behavior when the flag read fails) |
| **Evidence** | `database.md: platform_settings singleton with superadmin-only writes (0002) is the established pattern for exactly this shape of switch` |
| **Gap** | No flag mechanism exists; without one, M1-M3 features ship as big-bang deploys with rollback as the only lever. |

M1 (first consumer: entitlement gating + participant accounts; M0 adds no product features so needs none): a small feature_flags table (key, enabled, description, updated_by) read via a cached helper mirroring getActiveLanguage, superadmin admin UI. Simplify secondary: no flag SaaS, no percentage rollouts — booleans are enough for one academy.

### Backups & restore verification (DB, storage, config)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (11) backups/restore; M0 repair: backup verification |
| **Covers** | Confirm Supabase backup tier/PITR on the live project (currently unknown) · Restore TEST actually performed into a scratch project, timed, documented · Storage (cert assets) recovery story: assets are regenerable from immutable certificate_public_snapshot — document and test the bulk-regenerate path · Config recovery: prod env vars + dashboard settings inventoried somewhere that survives losing the dashboards · Stated RPO/RTO expectations agreed with the client |
| **Evidence** | `production-truth.md: PITR/backup tier unverifiable from here — carried as an open item needing dashboard access`; `certificates-email.md: snapshot-frozen SVG + deterministic renderer means every certificate asset is reproducible — a genuinely good DR property to formalize`; `ops-testing.md: env inventory exists only as .env.local.example; prod values live solely in the client's Vercel account` |
| **Gap** | Backups are whatever the Supabase tier silently provides; no restore has ever been attempted; losing the client's Vercel account would lose the only copy of prod config. |
| **Depends on** | client Supabase/Vercel dashboard access |

M0: check the tier (upgrade to PITR if not present — cost is trivial vs. the asset), run one real restore into a scratch project, document RPO/RTO (tiny DB → minutes), and write the config-recovery sheet during the prod env audit. Re-verify restore quarterly or after major schema phases (M1, M2/M3).

### Core authorization invariants: preserve + small hardenings (RBAC, RLS, service-role, CSRF, verification privacy, upload validation)

| | |
|---|---|
| **Status** | ✅ Implemented, reliable |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (12) RBAC, least privilege, RLS, admin-only ops, server-side checks, no hidden-UI authorization, CSRF, secrets management, verification privacy, file-upload validation |
| **Covers** | requireAdmin/requireSuperadmin as first statement in all 36 admin actions + layout (verified) — keep the per-action gate convention for every new action · RLS on every table, no anon policies, is_admin()/is_superadmin() SECURITY DEFINER — extend same pattern to all new tables · Service-role key confinement (server-only module, never NEXT_PUBLIC) + explicit-column DTO reads on anonymous paths · No hidden-UI authorization: sidebar/settings gating is UI-only but every real gate exists server-side (verified) — keep as reviewed invariant · CSRF: Next Server-Action origin check + SameSite cookies — document as the accepted posture; new API routes must add their own protection · Verification privacy: snapshot-only public reads, never scores/emails (test-asserted) — add regression tests to lock it · File-upload validation: SVG sanitize/normalize pipeline + <img> isolation boundary — never weaken the <img> layer · HARDENING: explicit .eq('active', true)/profile.active check in requireAdmin (today enforced only via RLS side-effect) · HARDENING: last-superadmin count guard (concurrent mutual demotion can strand zero superadmins) |
| **Evidence** | `auth-security.md: per-function grep — all 36 admin actions gate first (action files listed with line numbers); RLS mirrors the gate (0001:561-586)`; `auth-security.md: service.ts `import "server-only"` + key excluded from publicEnv (service.ts:1-29, env.ts:8-13)`; `auth-security.md: requireAdmin selects profile with no active filter — admin.ts:35-43 (re-verified this session: no .active reference in the file); disabled admins rejected only because RLS hides their row`; `auth-security.md: setAdminRole only blocks self-change (admins/actions.ts:79-91) — no count check`; `render.test.ts:61 asserts no score leak; template-import.test.ts 28 sanitizer cases` |
| **Gap** | The model is genuinely solid; the two real defects are the active-check-by-RLS-side-effect (one refactor away from re-admitting disabled admins) and the missing last-superadmin guard. |

M0: the two one-line hardenings + regression tests (authz on a disabled admin, verification-privacy fields, sanitizer). Then treat this row as the standing security convention list every new milestone is reviewed against. Secondary professional-review: parser-based SVG sanitizer is a nice-to-have post-launch, not a blocker, because <img>/resvg isolation is the load-bearing layer.

### Stored-XSS fix (admin content into dangerouslySetInnerHTML on candidate pages)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (12) stored-XSS finding; M0 repair: XSS fix |
| **Covers** | Escape i18n params or render via React text nodes on the two candidate surfaces (hub intro, passed-result body) · Audit every t() call used in an HTML context; add an escaping-by-default rule for params |
| **Evidence** | `Re-verified this session: dangerouslySetInnerHTML at src/app/certification/[accessToken]/page.tsx:56 and src/app/certification/[accessToken]/result/page.tsx:92 — the only two sites in src`; `auth-security.md: t() does raw {param} substitution with zero HTML escaping (dict.ts:33-35); param is the admin-entered questionnaire title → stored XSS in every candidate's browser on the platform origin` |
| **Gap** | An admin-entered questionnaire title containing markup executes in candidates' browsers; threat actor is limited to authenticated admins, but it breaks the trust boundary the rest of the codebase carefully maintains and there is no CSP backstop. |

M0, first PR of the program: HTML-escape interpolated params before substitution (or restructure the two strings to avoid innerHTML entirely), plus a unit test asserting params are escaped. Hours of work; closes the only known concrete vulnerability.

### Rate limiting: durable activation, fail-open visibility, login lockout

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (12) rate limiting; fail-open finding; part of M0 prod env audit |
| **Covers** | Verify/set UPSTASH_REDIS_REST_URL/TOKEN in the prod Vercel project (the single biggest unverified security variable) · Log + alert when rateLimit falls back to in-memory (today it degrades silently forever) · Document and assert the x-forwarded-for trust assumption (Vercel-only deployment) · Per-account login lockout or CAPTCHA beyond the 10/60s IP limit (the login endpoint's only defense; OTP flow already has its DB-backed 5-attempt cap) |
| **Evidence** | `auth-security.md: rate-limit.ts:105-121 — silent fall-through to per-process store on missing env or any Redis failure; per-instance limiting on Vercel is near-useless against distributed brute force`; `production-truth.md: .env.local does NOT contain the Upstash pair; prod Vercel env is in the client's separate account and cannot be verified from here`; `auth-security.md: keys derive from first x-forwarded-for hop (actions.ts:41-46) — fine on Vercel, bypassable anywhere else, assumption unrecorded` |
| **Gap** | The durable backend exists and is tested, but whether it has ever run in production is unknown, and if it silently isn't, every limiter in the system is decorative. |
| **Depends on** | prod env audit / client Vercel dashboard access (M0) |

M0: confirm/set the Upstash vars during the prod env audit (requires client dashboard access — schedule it); add a Sentry warning on fallback; record the XFF assumption in code. Login lockout (small counter table or Supabase captcha option) in M1 with the credential-lifecycle work. Keep fail-open semantics — availability over hard-blocking is right for this product — but make the failure visible.

### Security headers / CSP

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | (12) no-CSP finding |
| **Covers** | Content-Security-Policy (backstop for exactly the injection class found in the XSS row) · X-Frame-Options / frame-ancestors (admin dashboard is currently embeddable) · Referrer-Policy, Permissions-Policy · Confirm HSTS via Vercel platform defaults |
| **Evidence** | `auth-security.md: next.config.ts:1-18 has no headers() block; proxy sets no headers; the app relies entirely on Vercel platform defaults` |
| **Gap** | No defense-in-depth layer exists behind application-level escaping; one templating mistake (as already found once) executes unimpeded. |
| **Depends on** | Sentry (M0) for CSP report-only intake |

M0: headers() block in next.config.ts. Start CSP in report-only against Sentry for a few days, then enforce; the app has no external scripts, no inline-script dependency worth keeping, and data:-URI images (certificate view) need an explicit img-src allowance — an afternoon of tuning.

### Certificate asset download authorization + revoked-asset handling (A-09)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity M) |
| **Requested in** | (12) download authorization, public-revoked-assets finding; M0 repair: revoked-asset handling |
| **Covers** | M0 interim: on revoke, delete/neutralize the storage objects (assets are regenerable from the snapshot on reinstate) — revocation must actually revoke the artifact · A-09 target: private bucket + short-lived signed URLs or an authorizing download endpoint · Verify page mediates access; emailed links become short-lived or route through the endpoint · Cache-busting on regeneration (stable public URLs + CDN cache currently risk serving stale files) · Migration: new private bucket, dual-read window, cutover; old public URLs die (acceptable, note in comms) |
| **Evidence** | `certificates-email.md: revokeCertificate flips DB status only (certificates/actions.ts:49-57); pristine PDF/PNG remain publicly downloadable at stable {certId}/official.pdf paths (storage.ts:12-20) — undermines revocation for a credentialing platform`; `production-truth.md: bucket 'certificates' confirmed PUBLIC via storage API; 0 certificates revoked to date, so no live harm yet`; `certificates-email.md: regeneration overwrites the same public URL with no cache-busting (storage.ts:14-36)` |
| **Gap** | The artifact people actually share carries no revocation state and outlives revocation indefinitely; downloads are authorized by nothing but URL knowledge. |
| **Depends on** | A-09 private bucket migration (M1 completion); jobs (M1) for off-request regeneration; certificate-email PDF attachment (certificates domain) |

Split per the decisions brief: M0 ships the harm fix (revoke action also deletes storage objects; reinstate regenerates — small, uses existing generate path). The full A-09 private-bucket + signed-URL migration completes in M1 alongside jobs (regeneration off-request) and the switch of certificate emails to PDF attachment, which removes most public-URL dependence. Milestone recorded as M0 because that is where the security defect closes.

### Admin credential lifecycle: password reset, rotation, MFA, session management

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (12) secure password reset, session management, no-password-reset/MFA finding |
| **Covers** | Password reset flow (resetPasswordForEmail + recovery page) — today a locked-out admin needs Supabase-dashboard surgery · Forced first-login rotation: superadmin currently sets and knows every admin's password (breaks non-repudiation of the audit trail) · MFA for admins · Login lockout tie-in (from the rate-limiting row) · Session management: audit Supabase session lifetime/refresh-rotation settings (proxy refreshes indefinitely → effectively perpetual sessions for active admins); admin session revocation visibility |
| **Evidence** | `auth-security.md: grep — no resetPasswordForEmail, no auth.updateUser, no MFA anywhere in src; login form has no forgot-password link (auth/actions.ts:1-63)`; `auth-security.md: createAdmin sets the password directly with email_confirm:true, no forced rotation (admins/actions.ts:38-42)`; `production-truth.md: 3 auth users; Supabase auth settings (session lifetime, password policy) unverifiable from repo — dashboard item` |
| **Gap** | No credential self-service exists; shared-knowledge passwords mean account_history attribution is not defensible; session lifetime is whatever the dashboard default is. |
| **Depends on** | M0 prod env audit (Supabase auth settings); audit log (M1) for auth events |

M1 (with the identity milestone, where auth email templates and flows are being touched anyway): reset flow + forced rotation + auth-event logging (in the audit-log row). MFA is a client-decision secondary — recommend TOTP for the 3 admins, but don't block launch on it. Settings audit itself happens in the M0 prod env audit; the flows land here.

### Signed expiring invitations (separate from the permanent access token)

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (12) signed invitation tokens; A-03/M1 invitations entity |
| **Covers** | Invitation entity: hashed token, expiry, consumed/revoked states, created_by · Invite email carries the short-lived invitation token — not the permanent access_token (today the emailed link IS the credential, forever) · Access-token TTL/rotation policy decision for the exam surface (tokens currently never expire; passed assignments expose the result page indefinitely to anyone holding the email) |
| **Evidence** | `auth-security.md: invite emails embed the raw permanent access_token URL (participants/actions.ts:68-74, public-url.ts:11-13); no expiry mechanism exists on assignments (0001:176)`; `auth-security.md: mitigations that do exist — 192-bit entropy, email-OTP gate before attempts, per-assignment deactivation, rotation` |
| **Gap** | A forwarded or breached invite email grants the full candidate surface with no time bound; invitation and exam-access credential are the same string. |
| **Depends on** | enrollments/entitlements (M1); participant accounts (M1) for the durable post-exam home |

M1 per A-03: invitations table (token stored hashed like the OTP codes), invite flow issues the short-lived token which resolves to the assignment/enrollment on first use; existing access tokens keep working through the transition (dual-accept window). Decide the exam-token TTL policy with the client — recommend expiring result-page access after N months or requiring OTP re-verification.

### Stripe webhook security + payment environment separation

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | launch → **M2** (complexity M) |
| **Requested in** | (12) Stripe webhook verification, test/prod separation |
| **Covers** | Webhook signature verification on the receiver route · stripe_events idempotency table (dedupe, replay safety, ordered processing) · Test-mode vs live-mode key separation across local/preview/prod environments · Webhook failure/backlog visibility (feeds observability + reconciliation rows) |
| **Evidence** | `auth-security.md: zero route handlers, zero payments code anywhere — 'a future greenfield, not a present gap'`; `decisions-brief A-04 fixes the design: signature verification + stripe_events + reconciliation as first-class requirements` |
| **Gap** | Nothing exists; the risk is only that the first webhook receiver gets built without the idempotency/signature layer under deadline pressure. |
| **Depends on** | orders/payments schema (M2); jobs (M1) for async event processing; env schema validation (M0) |

M2 per A-04, inseparable from the checkout build — signature verification and the stripe_events table are the first commit of the Stripe slice, not a hardening pass afterwards. Enforce env separation via the M0 env schema (distinct STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET per environment, refuse live keys outside prod). Note: D-01 (client) decides whether M2 is in the first release; this row rides with M2 wherever it lands.

### Audit-log integrity + generalized audit trail + admin auth events

| | |
|---|---|
| **Status** | 🟡 Implemented, incomplete |
| **Disposition** | launch → **M1** (complexity M) |
| **Requested in** | (12) audit-log integrity; M1 generalized audit log |
| **Covers** | Verify the account_history append-only trigger is currently ENABLED in prod (project memory documents disabling it via SQL editor at least once) · Constrain event_type vocabulary (free text today — typos create orphan categories) · Admin auth events: login/logout/failed login (none exist anywhere) · Generalized audit log beyond participant scope: content edits, admin management, settings changes, entitlement/order transitions · GDPR-compatible erasure path that does not require disabling the immutability trigger (anonymize participant FK instead of cascade-delete) |
| **Evidence** | `database.md: trg_account_history_immutable fires even for service-role (0001:493-504) — genuinely strong; but event_type is unconstrained free text (0001:279-288) and the participants CASCADE collides with the trigger, making hard-delete require disabling it`; `production-truth.md: 146 history rows, 11 event types in use, all within the documented vocabulary; whether the trigger is currently enabled is unverifiable from here`; `auth-security.md: no admin login/logout/failed-login events exist anywhere` |
| **Gap** | The audit trail is participant-scoped only, its integrity in prod is unconfirmed, and the actors most worth auditing (admins authenticating, admins editing content/settings) leave no trace. |
| **Depends on** | M0 prod audit (trigger state); GDPR workflow design (M6/professional-review register) |

M0 verifies the trigger state (one query during the prod audit). M1 builds the generalized audit_log table (same append-only trigger pattern, actor_type/actor_id, FK-constrained event vocabulary) and wires auth events + admin management + settings writes; account_history remains the participant timeline — do not rewrite history rows. Design the erasure path as anonymization so GDPR never again requires disarming the safety trigger.

### Roles beyond admin/superadmin + formal impersonation safeguards

| | |
|---|---|
| **Status** | ⬜ Missing, foundation-ready |
| **Disposition** | post-launch → **M6** (complexity L) |
| **Requested in** | (12) impersonation safeguards; A-11 instructor/support roles |
| **Covers** | Instructor/support role tier: role enum + capability map + RLS predicates (is_admin() is binary today) · Formal impersonation: reason required, banner, read-only, audited · Near-term mitigation: log admin-originated candidate-surface access (any admin can open any access link indistinguishably from the candidate today) |
| **Evidence** | `auth-security.md: role is text CHECK ('admin','superadmin') (0001:45); a plain admin can do everything except admin/language management incl. manual-pass and revocation; no read-only tier scaffolding exists`; `auth-security.md: impersonation de facto possible and invisible — candidate flow is unauthenticated` |
| **Gap** | One binary trust tier for all staff; no way to grant content-only or support-only access; candidate-surface access by admins is unattributable. |
| **Depends on** | participant accounts (M1); generalized audit log (M1); actual instructor/support staffing (client) |
| **Risk of building now** | Building role tiers and impersonation UI before any instructor or support person exists adds RLS complexity and admin surface for zero current users, and would be designed blind to the real capability boundaries those roles will need. |

Per A-11: design now (the M1 audit_log and capability-map naming should anticipate it), build when cohorts/support volume exist (M6). Formal impersonation waits for participant accounts. The one cheap near-term item — logging admin access to candidate links — can ride along with M1 audit-log wiring if trivial.

### Production environment audit + boot-time env validation

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M0** (complexity S) |
| **Requested in** | M0 repair: prod env audit; (2)/(12) silent-degradation elimination |
| **Covers** | Audit prod Vercel env: Upstash pair, RESEND_API_KEY/FROM, NEXT_PUBLIC_SITE_URL, service key — requires client-account dashboard access · Boot-time Zod env schema: eliminate the three silent-degradation classes (lazy service-key throw, silent Resend-off, silent relative-URL fallback) · Hard guard: refuse to issue certificates when the verification URL would be relative (a misconfigured deploy today bakes broken QR codes into immutable snapshots) · Supabase dashboard audit: password policy, leaked-password protection, storage bucket policy detail, Postgres role grants, PITR tier · Confirm live-DB trigger states: account_history immutability enabled; auto-admin trigger (handle_new_admin) confirmed absent |
| **Evidence** | `ops-testing.md: env handling is mixed eager/lazy/silent — NEXT_PUBLIC_SITE_URL falls back to RELATIVE paths (proven by utilities.test.ts:119-123) and that string freezes into certificate_public_snapshot forever (issue.ts:127,142-152)`; `production-truth.md: 0 snapshots with relative verification_url so far (the var has always been set) — luck, not a guard`; `production-truth.md: full list of dashboard-side unknowns carried as open items (Upstash vars, auth settings, bucket policies, PITR, trigger state)` |
| **Gap** | Whole classes of misconfiguration are designed to degrade silently, and the production values of the security-relevant vars live in accounts this team cannot currently see. |
| **Depends on** | client Vercel + Supabase dashboard access |

M0, requires scheduling client dashboard access (Vercel + Supabase): run the checklist above, fix what's missing, capture results in the config-recovery sheet (backups row). Ship the env schema + relative-URL issuance guard in the same PR as the health check — they share the 'no silent degradation' principle.

### Conceptual separation guardrail: enrollment ≠ entitlement ≠ progress ≠ assessment ≠ certification ≠ order ≠ payment ≠ invitation

| | |
|---|---|
| **Status** | 🟠 Implemented, structurally weak |
| **Disposition** | launch → **M1** (complexity S) |
| **Requested in** | (13) data-model conceptual-separation requirement |
| **Covers** | Verify the decisions-brief model satisfies the separation (it does: A-03 enrollments/entitlements + assignment-as-exam-ticket, A-04 orders/payments, invitations entity) · Flag collapse risk 1: access_token doubles as invitation credential today — resolved only if the M1 invitations entity actually replaces token-in-email · Flag collapse risk 2: nullable enrollment_id on assignments invites 'just read the assignment' shortcuts — access decisions must read entitlements, never assignment existence · Flag collapse risk 3: manual-pass writes a synthetic 100% attempt (assessment/certification blur) — acceptable locked behavior, but orders/entitlements must never gain equivalent synthetic-record idioms · Migration-review checklist item enforcing one-entity-one-concept on every M1-M3 schema PR |
| **Evidence** | `database.md: assignment≈enrollment only at questionnaire granularity; invitation-as-entity, enrollments, entitlements, orders, payments, progress all absent`; `auth-security.md: invite email embeds the raw permanent access_token (participants/actions.ts:68-74) — invitation and credential are one string today`; `auth-security.md: manualPass creates a synthetic 100% attempt via recordManualPassAttempt (participants/actions.ts:473-535)` |
| **Gap** | Today three concepts (invitation, enrollment-ish fact, exam access) live in one row + one token; the target model separates them but only discipline during M1 schema work keeps it that way. |
| **Depends on** | A-03 schema (M1); invitations entity (M1) |

No challenge to the A-03/A-04 model — it satisfies the requirement. Make separation enforceable: each entity owns its status column and transitions helper; certification_assignments gains enrollment_id but keeps exactly its exam-ticket role; gating code imports an entitlement-check helper so 'has assignment' can never quietly become the access predicate. Review each M1-M3 migration against this row.


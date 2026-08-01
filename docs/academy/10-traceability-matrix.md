# Traceability matrix — feature → requirement → entities → surfaces → tests → monitoring → milestone

**2026-08-01** · Compiled row-for-row from the 112-row audit capability matrix, the locked architecture decisions (A-01…A-12), and live-production facts verified in prod 2026-08-01.

One compact row per feature. The full story of each row — evidence with `file:line` citations, gap analysis, disposition rationale — lives in [01-capability-matrix.md](01-capability-matrix.md) (same six domain groupings, same row order). Milestones are defined in [07-milestone-backlog.md](07-milestone-backlog.md); monitoring signal names are defined in [05-production-safety-plan.md](05-production-safety-plan.md); entity definitions in [04-data-model.md](04-data-model.md); D-xx decision IDs in [08-decision-register.md](08-decision-register.md). Where a feature is excluded, simplified, replaced or deferred, the Requirement cell says so.

Legend (tight abbreviations, used throughout):

- **Entities** — `+name` = new table/column that does not exist in production today; plain = exists now. Shorthand: `assignments` = certification_assignments, `certs` = certificates, `cert_assets` = certificate_assets, `snapshot` = certificate_public_snapshot.
- **API/service** — SA = server action · rt = API route handler · lib = shared module · trig = DB trigger/index/constraint · job = outbox job type · mig = migration.
- **UI** — A = admin · C = candidate (tokenized flow) · P = participant account · Pub = public · — = none.
- **Tests** — U = unit · I = integration · Sm:x = smoke journey *x* (post-deploy + scheduled, per 05 plan): Sm:admin (login + CRUD touch), Sm:exam (token → OTP → attempt → result), Sm:cert (pass → issue → download), Sm:verify (QR/ID verify), Sm:claim (account claim → dashboard), Sm:lesson (enrol → lesson → progress → resume), Sm:checkout (test-mode purchase → webhook → entitlement), Sm:portal (credential portal download).
- **Monitoring** — Sentry · uptime (monitor on /api/health) · hlth:x (deep health probe *x*) · rec:x (reconciliation invariant *x*) · al:x (named alert *x*) · CI (gate + migration drift check) · audit (audit_log/account_history trail) · — = no dedicated signal.
- **MS** — milestone M0–M6; client-gated rows carry their D-xx decision ID.

## Roles, permissions & admin operations (17 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Participant accounts & claim | Participants create/claim a durable account by verified email (A-02) | +participants.auth_user_id · +unique lower(email) idx · +audit_log | Supabase Auth signup · SA claim (reuses OTP core) · participant RLS policies | P | U claim/email-norm · I claim+RLS · Sm:claim | Sentry · audit auth events | M1 |
| Admin capability map | Admin capability envelope formalised as a namespaced action registry (A-11) | admin_profiles | lib capability map consulted by requireAdmin (src/lib/auth/admin.ts) | A | U map · I per-action authz | al:authz-spike | M1 |
| Instructor/mentor role | Course-scoped staff tier — design in M1, build only when headcount exists (A-11, D-11) | +instructor_courses · +admin_profiles.role widened | has_role() · scoped RLS predicates · scoped reads | A | I RLS scope matrix | audit | M6 |
| Support administrator role | Read + resend-only tier; deferred until support volume exists (A-11) | admin_profiles.role · +email_events · +support_requests | capability-subset gates · resend SAs | A | I authz | — | M6 |
| Admin account hardening | Disabled admins locked out; last superadmin protected; self-held credentials | admin_profiles | requireAdmin active check + setAdminRole guard (M0) · reset/invite onboarding (M1) | A | I disabled-admin regression | Sentry · audit (M1) | M0 |
| Admin dashboard metrics | Simplified: ops-first tiles phased per milestone; no bespoke alerting UI | +jobs · +email_events · attempts · certs · +orders (M2) | tile queries per phase | A | I tile queries | surfaces al:jobs-dead + al:email-fail | M1 |
| Participant list filters | Server-side search/pagination/filters; data-driven bar so later dimensions plug in | participants · +enrollments · certs | lib shared list-query layer (reused by other lists) | A | I filter queries | — | M1 |
| Participant detail 360° | One page: identity, access, money, attempts, comms, audit feeds | +enrollments/+entitlements panels · +participant_notes · +email_events · +audit_log · attempts | detail loaders · notes SA · attempt-viewer pull-forward | A | I loaders | — | M1 |
| Cohort management | Client decision D-03; schema kept ready at zero cost, no build until confirmed | +enrollments.cohort_id (M1) · +cohorts (if confirmed) | cohort CRUD + announcements via jobs (if built) | A | I | — | D-03 (≥M6) |
| Manual enrollment | Admin grants access with duration, payment class, reason and audit trail | +enrollments · +entitlements · +orders (method=manual) · +audit_log | SA creating order + enrollment + entitlement in one flow | A | U schema · I grant flow | rec:orders-vs-entitlements (M2) | M1 |
| CSV import | Deferred — 17 participants; manual enrolment suffices; two-phase import only on real bulk need | +import_batches (if ever) · +jobs | validate/apply phases on jobs | A | I preview/commit | al:jobs-dead | M6 |
| Reporting & exports | Filter-aware CSV per admin list; revenue reporting defers to Stripe dashboard (A-04) | list entities · +audit_log (`data.exported`) | export SA per list (reuses M1 query layer) | A | I | audit | M6 |
| Support workflow | Simplified: reference-ID mailto/form + minimal request log; inbox only if volume proves need (D-10) | +support_requests | ref-code helper · contact SA | C·P·A | U ref-code | — | M6 |
| Controlled impersonation | Reason-required, read-only default, bannered, fully audited (A-11); after accounts exist | +impersonation_sessions · +audit_log | start/end SA · sensitive-action blocklist | A · P banner | I blocklist | audit | M6 |
| GDPR & privacy program | Export/anonymize workflows; retention per D-12; anonymize primitive recommended pull-forward to M1 | +participants.anonymized_at · +audit_log | anonymize SA · export-bundle SA | A·P | I anonymize-keeps-certs | audit | M6 |
| Generalized audit log | Actor/object-scoped append-only trail; account_history stays the participant timeline | +audit_log | trig append-only · emit helper wired into every mutation | A feeds | U action registry · I append-only | signal source for alerts | M1 |
| Email templates & copy | Replaced: code-owned templates + DB copy blocks; no WYSIWYG editor | +email_copy_blocks · +email_events · +jobs | HTML-escaping substitution lib · copy-block CRUD SA | A | U escaping · I render | al:email-fail · email_events | M6 |

## Learning platform (21 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Participant dashboard | Cross-course account home: progress, resume, certification status, expiry | +enrollments · +entitlements · +lesson_progress · certs | lib src/lib/learning/data.ts DTO · participant RLS | P | I · Sm:lesson | Sentry | M3 |
| Course dashboard | Per-enrolment course home: modules, lock state, progress, exam eligibility (status only) | +course_versions · +modules · +lessons · +lesson_progress · +entitlements | DTO + eligibility computation (no auto-assignment) | P | I gating | Sentry | M3 |
| Course content structure | course → version → module → lesson hierarchy (A-06); quizzes never create assignments | +course_versions · +modules · +lessons | mig + lock trig · DTO reads | A·P | I lock triggers | CI drift | M3 |
| Course versioning | Simplified: publish/archive + version pin at enrolment; edit = duplicate; no migration tooling | +course_versions · +enrollments.course_version_id | guard trig (guard_questionnaires_update pattern) · publish/duplicate SA | A | I lock | — | M3 |
| Module flags & ordering | required / hidden / sort_order; locked = derived; subtopics schema-reserved only | +modules (+parent_module_id reserved) | CRUD SA · up/down reorder | A·P | U | — | M3 |
| Lesson types & rendering | video / written / download / external / quiz types; video via hosted provider (A-07, D-02) | +lessons · +resources | provider upload + signed playback · per-type renderers | A·P | I · Sm:lesson | Sentry | M3 |
| Lesson metadata | Plain columns (title/objective/duration/notes/resources); no per-lesson rule engine | +lessons cols | CRUD | A·P | U schema | — | M3 |
| Audio-only mode | Simplified: optional audio file per lesson, only on client demand; no extraction/background engineering | +lessons.audio_url (if needed) | upload + native `<audio>` | P | — | — | M6 |
| Bookmarks & favourites | One polymorphic bookmarks table (lesson/resource/term); favourites = filtered view | +bookmarks | toggle SA | P | U | — | M6 |
| Personal notes | Private-only v1 (sharing dropped); video-timestamp aware once player exists | +notes | CRUD SA | P | U | — | M6 |
| Completion tracking | lesson_progress state machine; unweighted %; course complete = all required modules | +lesson_progress · +enrollments.progress_pct | progress writes in DTO · completion rules | P·A | U calc · I | Sentry | M3 |
| Min watch requirement | Simplified: heartbeat + configurable threshold (default 90 %); no anti-cheat (A-07) | +lesson_progress.watched_pct / last_position_seconds | heartbeat SA | P | U threshold | — | M3 |
| Locked progression | Server-side gates: active entitlement + linear progression (per-version toggle) | +course_versions.linear_progression · +lesson_progress · +entitlements | DTO gate — never client-only | P | I gate matrix · Sm:lesson | Sentry | M3 |
| Drip release | Schema-ready typed release_rule; only `immediate` honoured at launch; rest post-launch | +modules.release_rule | read-time rule evaluation (no cron) | P·A | U rule eval | — | M6 |
| Self-paced mode | Default delivery model = entitlement access window; no extra machinery | +entitlements | — (entitlement gate) | P | — | — | M3 |
| Cohort mode | Client decision D-03; heaviest untriggered feature; only enrollments.cohort_id reserved now | +cohorts · +cohort_module_releases · +enrollments.cohort_id | cohort scheduling + comms via jobs (if built) | A·P | I | — | D-03 (≥M6) |
| Resume | Derived from lesson_progress (latest activity + video position); no new state | +lesson_progress (+index) | resume query in DTO | P | U | — | M3 |
| Content search | Excluded from first release (module list is the navigation); later Postgres tsvector; transcript search excluded | +lessons tsvector | search rt (when built) | P | I | — | M6 |
| Glossary | Terms + per-lesson panel via join; hover auto-linking last if ever | +glossary_terms · +lesson_glossary_terms | CRUD + lesson panel | A·P | U | — | M6 |
| Resource library | Split: M3 core = attachments + authorised signed-URL downloads (private bucket, A-09 pattern); faceted library post-launch | +resources (+metadata cols) · +course-content bucket | signed-URL download rt | P·A | I authz | Sentry | M3 |
| Course builder | Admin authoring: version list → modules → lesson editor; direct-to-provider media upload | +course_versions · +modules · +lessons · +resources | admin CRUD SAs · provider upload · read-only preview | A | I | Sentry | M3 |

## Assessment engine (22 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Final exam chain | Keep engine; M0 closes double-submit/fail-path races and writes `in_progress` (A-08) | attempts (+uniq open idx, +immutability trig) · assignments | recordAttempt fixes (checked submit update, `.neq('passed')` guard) | C | I race · Sm:exam | Sentry · rec:passed-vs-certs | M0 |
| Configurable pass threshold | Already compliant; freeze-once-assigned kept as the integrity guarantee | questionnaires.passing_percentage | none | A | existing U | — | M0 |
| Result feedback (compliant) | Keep the no-leakage final-exam policy untouched when practice modes arrive | attempts · snapshot | none | C | existing U | — | M0 |
| Question bank core | CRUD kept; M0: transactional option replace (RPC) + lock-status precheck | questions · question_options | RPC option replace · locked-notice render | A | I partial-failure | Sentry | M0 |
| Question bank manager | Search/filter/pagination + duplicate action (operationalises edit = duplicate) | questions | list query layer · duplicate SA | A | I | — | M1 |
| QB metadata extensions | difficulty/author/lineage columns; review workflow simplified to draft/published | +questions.difficulty / created_by_admin_id / superseded_by_question_id | form fields | A | U | — | M4 |
| QB import/export | Deferred (44 questions — authoring outpaces an importer); export rides the M6 exports bundle | — | M6 export SA | A | — | — | M6 |
| True/false type | Simplified: authoring preset seeding two options on single_choice; no DB type | — (question_options seed) | form preset | A | U | — | M4 |
| Ordering/matching types | Client decision (curriculum); default no — requires a generalised response model first | — (response-model redesign if confirmed) | — | C | — | — | client (≥M4) |
| Advanced question types | Post-launch backlog only, against concrete demand; human-graded queue absent by design | — | — | — | — | — | M6 |
| Order randomization | Fold into the M4 frozen attempt blueprint (fixes reshuffle-on-resume + audit trust) | +attempts.question_set | blueprint freeze at attempt-start | C | U | — | M4 |
| Question pool selection | Topic-balanced sampling into frozen blueprint; repeat penalty; content authoring is the long pole | +questionnaire_selection_rules · +questionnaires.pool_mode · +attempts.question_set | sampler at attempt-start · serve-time active filter | A·C | U sampler · I | Sentry | M4 |
| Weighted questions | Client decision; schema-ready inert weight column; challenge: fights understandable results | +questions.weight (inert, NULL=1.0) | scoring change only on confirmation | C | U scoring | — | client (schema M4) |
| Topic floors / critical rules | Client decision D-06, coupled to pool activation; schema-ready only | +selection_rules.min_percentage · +questions.is_critical | scoring gate if confirmed | C·A | U | — | D-06 (schema M4) |
| Retry cooldowns | Per-questionnaire ladder (D-05: 0/12 h/24 h), server-enforced; attempts stay uncapped | +questionnaires cooldown cols | attempt-start enforcement · hub next-eligible display | C·A | U · I | — | M4 |
| Non-final assessment types | purpose discriminator; certificate issuance gated to `final_exam` only | +questionnaires.purpose / show_explanations | issuance gate · per-purpose feedback policy | C·P | I gate | rec:passed-vs-certs | M4 |
| Pre-course diagnostic | Non-certifying baseline on the existing chain; per-enrolment initial-vs-final comparison | questionnaires (purpose=diagnostic) · +enrollments link | suppress pass/cert semantics · guidance from buildRecommendations | C·P·A | I | — | M4 |
| Enhanced feedback | topic_scores frozen at submit; explanations only when purpose ≠ final_exam | +attempts.topic_scores | freeze in recordAttempt · topic bars · readiness rule | C·P·A | U | — | M4 |
| Admin attempt viewer | Read-only drill-in incl. exact answers + manual-pass flag; zero schema cost; pull-forward to M1 recommended | attempts · attempt_answers (existing) | read-only loaders on participant detail | A | I | — | M4 (→M1 rec.) |
| Manual pass | Shipped and verified; note folds into reason; attachment deferred | attempts (synthetic 100 %) · account_history | none | A | existing | audit | M0 |
| Attempt invalidation | Additive invalidation columns; original row immutable forever (M0 trigger whitelists them) | +attempts.invalidated_* | invalidate SA · assignment-status recompute | A | I recompute | audit | M4 |
| Assessment analytics | Thin v1: question_stats + questionnaire_stats views as dashboard cards; discrimination stats deferred | +stats views | dashboard cards | A | I views | — | M4 |

## Certification & credentials (14 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Issuance pipeline & retry | Explicit partial-failure handling: retry action, failure logging, URL guard; async via jobs in M1 (A-08, A-05) | +certs.assets_status/assets_error · +jobs (M1) | issue-retry SA · job:cert.generate_assets / cert.send_email | A·C | I idempotent retry · Sm:cert | Sentry · rec:passed-w/o-cert · al:cert-gen-fail | M0 |
| Certificate state machine | valid/revoked/replaced × asset states; `expired` and `pending review` excluded (locked: never expires) | +certs.status ext · +cert_assets.status/error | state-consistency trig · two-axis admin display | A | U transitions | rec:certs-vs-assets | M0 |
| Official print formats | Shipped (PDF + 300-DPI PNG); riders: cache-busted paths + private bucket; JPG dropped (defer) | +cert_assets.content_version / storage_path | versioned storage paths on regeneration | A·C·Pub | existing U · Sm:cert | — | M0 |
| Social formats + templates | Blocked on client-supplied designs; reuse the proven SVG→resvg pipeline, generated via jobs | +cert_assets types (linkedin_post_png, badge_*) · +certificate_templates types | render job · template-type picker CRUD | A·P | U render | al:jobs-dead | M5 |
| Certificate ID scheme | Simplified: keep existing scheme; series segment (D-16) for new certificates only — never rename issued numbers | +courses.series_code | number-generator extension; verify accepts both shapes | — | U format | — | M5 |
| Public verification page | Ships as-is (strongest surface); M0: signed assets + revoked presentation; M5: structured issuer/series/version fields | snapshot | consume A-09 authorizing endpoint | Pub | Sm:verify | uptime · Sentry | M0 |
| Revocation & reinstatement | Revoked artifact actually dies: private bucket + authorizing endpoint (A-09, D-04) + optional public note | +cert_assets.storage_path · +certs.public_revocation_note · +private bucket | rt /api/certificates/assets/[id]/[type] · M0 revoke deletes storage objects | A·Pub | I revoked-denied | Sentry | M0 |
| Replacement with lineage | New row keeps the number, old token stays resolvable, predecessor → `replaced` | +certs.replaces_/replaced_by_/replaced_at/replacement_reason · partial unique idx | replace SA minting new row + snapshot | A·Pub | I lineage | rec:certs-vs-assets | M5 |
| Credential portal | Authenticated all-certificates home with downloads; participant RLS, not service-role widening | certs via +participants.auth_user_id RLS | participant-aware signed-URL downloads | P | I RLS · Sm:portal | Sentry | M5 |
| LinkedIn support | Add-to-Profile deep link + copyable metadata card; expiry fields omitted (never-expires lock) | — | deep-link builder lib | C·P | U link | — | M5 |
| Website badge | Simplified: downloadable image + documented HTML snippet; no embed script; revocation-aware serving | +cert_assets badge types | served via A-09 endpoint (greyed revoked variant) | Pub·P | U | — | M5 |
| Share/verify analytics | Simplified: aggregate counters only, no per-visitor rows (privacy-conscious) | +certificate_stats | server-side upserts from verify page + asset endpoint | A | U upsert | — | M6 |
| Bulk certificate operations | Bulk = N idempotent jobs + progress/failure view; never a synchronous loop | +jobs | enqueue SAs · failed-assets filter (mini version in M0) | A | I | al:jobs-dead | M5 |
| Certificate template manager | Simplified: designer-SVG + placeholders kept; **no parametric editor**; add preview, overflow warnings, series placeholder | certificate_templates | preview render · overflow checks · {{series_label}} | A | U render | — | M5 |

## Commerce & access (11 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Offering + Stripe Checkout | One-time EUR checkout (A-04); success page never grants access; pricing/legal per D-07/D-13/D-14 | +course_offers · +orders | SA create Checkout Session · success page (copy only) | Pub·P | I session · Sm:checkout | Sentry | M2 |
| Webhook + event pipeline | Signature-verified, idempotent receiver; entitlement granted **only** here (A-04) | +stripe_events · +orders · +payments · +entitlements | rt /api/webhooks/stripe · reprocess SA | A | I replay / out-of-order | al:webhook-fail · rec:stripe-vs-orders | M2 |
| Orders + payment records | Full schema in M1 so manual payments are real orders; M2 only wires Stripe transitions | +orders · +payments · +audit_log | transitions helper · guard trig · order list/detail | A | U transitions | rec:stripe-vs-orders | M1 |
| Entitlements | Authoritative access record, six-state machine (A-03); scope's ten "states" normalised to status+source+reason | +enrollments · +entitlements · +assignments.enrollment_id | state-machine lib · admin lifecycle controls | A | U states · I | rec:orders-vs-entitlements | M1 |
| Manual payment recording | Offline payment → real order → enrollment + active entitlement in one audited flow | +orders (method≠stripe) · +enrollments · +entitlements · +audit_log | SA record-manual-payment | A | I flow | rec:orders-vs-entitlements | M1 |
| Coupons | Replaced by Stripe promotion codes v1; academy keeps attribution snapshot only | +orders attribution cols | allow_promotion_codes on Checkout Session | Stripe dash | I attribution | — | M2 |
| Private invitation links | Signed, expiring, hashed invitation entity split from the exam token; free grants v1 | +invitations | create/redeem SA · dual-accept window | A·Pub | U hashing · I redeem | audit | M1 |
| Access expiry + duration | expires_at from offer duration (D-09, proposed 365 d); read-time enforcement + daily cron flips + reminder emails | +entitlements.expires_at · +course_offers.access_duration_days | daily cron flip · job reminder emails | A·P | U window · I | hlth:jobs-heartbeat | M2 |
| Refund handling | Webhook refunds → order arithmetic; refund-after-certificate flags review (D-08); certificate untouched | +refunds · +orders · +entitlements | refund event handlers · needs_review queue | A | I policy matrix | al:refund-after-cert | M2 |
| Dispute handling | Dispute → suspend + notify + review; closure restores (won) or revokes (lost) | +disputes · +orders · +entitlements | charge.dispute.* handlers · admin notification job | A | I | al:dispute-created | M2 |
| Entitlement gating + recon | Single lookup helper, read-time expiry; Stripe never consulted at request time (A-04) | +entitlements | lib src/lib/access/getActiveEntitlement · recon queries | — (all gated surfaces) | U predicate · I gating | rec:paid-w/o-entitlement | M1 |

## Production safety, reliability & security (27 rows)

| Feature | Requirement | Data entities | API/service | UI | Tests | Monitoring | MS |
|---|---|---|---|---|---|---|---|
| Attempt guards (DB-enforced) | Single open attempt + post-submit immutability at DB level (A-08); trigger whitelists M4 invalidation cols | attempts (+uniq idx, +trig) | mig · `.neq('passed')` fail-path guard | — | I race regression | Sentry | M0 |
| Cert issuance states + retry | No silent dead-ends: state columns, logged failures, admin issue-retry | +certs.assets_status/assets_error | issue-retry SA · checked write results | A | I | rec:passed-w/o-cert | M0 |
| Commerce state machines | Explicit status + CHECK + transitions helper on every money/access table | +orders · +payments · +entitlements | transitions helpers · audit writes | A | U | rec:* | M1 |
| Jobs + email state machines | Outbox jobs + Resend webhook = durable, retried, observable side-effects (A-05) | +jobs · +email_events | rt /api/cron/jobs · rt /api/webhooks/resend | A | I drainer · U backoff | hlth:jobs-heartbeat · al:jobs-dead · al:email-fail | M1 |
| Import pipeline state machine | Deferred with CSV import; two-phase validate/apply on jobs if ever built | +import_batches (if ever) | — | — | — | — | M6 |
| Observability core | Sentry + structured logger + error boundaries; every catch site logs with context (A-10) | — | Sentry SDK · instrumentation.ts · error.tsx | all | — | Sentry (the signal itself) | M0 |
| User-visible failure states | No fake success: checked ActionButton results + FormState support reference | — | FormState.supportRef · checked action results | A·C | U · I | Sentry | M0 |
| Health checks | /api/health shallow + deep (DB, storage, email, env; jobs/webhook probes added M1/M2) (A-10) | — | rt /api/health | — | I | uptime · hlth | M0 |
| Synthetic smoke tests | Playwright journeys post-deploy + scheduled, against staging Supabase | — | CI job + schedule | — | is the Sm:* suite | al:smoke-fail | M0 |
| Reconciliation sweeps | Invariant sweeps detect + surface with guided repair — never silently rewrite; first job rides M1 jobs | +jobs (reconcile_invariants) | recon job · one-click repairs | A | U invariant queries | rec:* alerts | M2 |
| Alerting | Small actionable rule set: Sentry rules, uptime, CI/smoke, invariant alerts | — | alert-rule config | — | — | the signal layer itself | M0 |
| Deployment safety | CI gate (typecheck+lint+test) + branch protection + rollback playbook; maintenance flag in M1 | +feature_flags (M1) | GitHub Actions workflow | — | CI runs U/I | al:ci-fail | M0 |
| Migration discipline | Supabase CLI baseline + drift check in CI; no more SQL-editor pastes | — | supabase link · db diff in CI | — | CI drift check | CI | M0 |
| Feature flags | Boolean flags table + superadmin UI; simplified — no SaaS, no percentage rollouts | +feature_flags | cached read helper (getActiveLanguage pattern) | A | U | — | M1 |
| Backups & restore | PITR tier verified + one real restore drill + config-recovery sheet; re-verify quarterly | — | ops runbook | — | restore drill | manual quarterly drill | M0 |
| Core authz invariants | Keep the solid model; fix active-check + last-superadmin guard; standing review checklist | admin_profiles | requireAdmin/setAdminRole guards | A | I authz regression suite | al:authz-spike | M0 |
| Stored-XSS fix | Escape interpolated params before substitution; first PR of the programme | — | dict.ts fix (src/lib/i18n/dict.ts:33-35) | C | U escaping | Sentry | M0 |
| Rate limiting activation | Confirm Upstash in prod (env audit); visible fallback; login lockout in M1; keep fail-open | — | Sentry warn on fallback · lockout counter (M1) | — | existing U backends | al:ratelimit-fallback | M0 |
| Security headers / CSP | headers() in next.config.ts; CSP report-only → enforce | — | next.config.ts | all | — | CSP reports → Sentry | M0 |
| Asset download authorization | M0 harm fix (revoke deletes objects); full A-09 private bucket + signed URLs completes M1 (D-04) | +cert_assets.storage_path · +private bucket | authorizing rt · signed URLs · PDF-attachment emails | A·Pub·C | I revoked-denied | Sentry | M0 |
| Admin credential lifecycle | Reset + rotation + session policy + auth-event logging; MFA recommended (client) | admin_profiles | Supabase reset flow · auth-event wiring | A | I | audit | M1 |
| Signed expiring invitations | Invitation credential split from the permanent exam token; hashed at rest | +invitations | hashed-token issue/redeem · dual-accept window | A·C | U · I | audit | M1 |
| Stripe webhook security | Signature verification + idempotency ledger as the first commit of the Stripe slice; env separation enforced | +stripe_events | verification layer · per-env key schema | — | I bad-signature | al:webhook-fail | M2 |
| Audit-log integrity | M0: verify append-only trigger armed in prod; M1: generalized trail + admin auth events | +audit_log · account_history | append-only trig · auth-event wiring | A | I append-only | audit | M1 |
| Roles + impersonation safeguards | Post-launch per A-11; M1 capability-map naming anticipates it; log admin candidate-link access meanwhile | admin_profiles.role · +impersonation_sessions | capability-map growth | A | I | audit | M6 |
| Prod env audit + boot validation | Verified env schema at boot; no silent degradation; needs client dashboard access (Vercel + Supabase) | — | zod env schema · relative-URL issuance guard | — | U schema | hlth env checks | M0 |
| Conceptual separation guardrail | enrollment ≠ entitlement ≠ assignment ≠ order ≠ payment ≠ invitation ≠ progress; per-migration review | all new entities | entitlement-check helper import rule · migration checklist | — | migration-review checklist | — | M1 |

## Coverage note

Every feature row of the audit capability matrix appears in **exactly one** row above — none dropped, none duplicated. Cross-check by domain row counts against [01-capability-matrix.md](01-capability-matrix.md): Roles/admin **17** + Learning **21** + Assessment **22** + Certification **14** + Commerce **11** + Safety/security **27** = **112**. Milestone totals are consistent with the M0–M6 skeleton in [07-milestone-backlog.md](07-milestone-backlog.md); client-gated rows (D-03 ×2, D-06, two curriculum question-type decisions) carry their decision IDs instead of a fixed milestone and are tracked in [08-decision-register.md](08-decision-register.md).

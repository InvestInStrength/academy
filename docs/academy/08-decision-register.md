# Decision register — open decisions, recommendations, blocking status

2026-08-01 · Compiled from the 112-row capability matrix ([01](01-capability-matrix.md)), the locked
architecture decisions A-01…A-12 ([03](03-target-architecture.md)), and the domain audits; production
facts verified live 2026-08-01.

This register lists every decision that is **not** engineering's to make: client product/curriculum
calls, client sign-offs on recommended paths, and items requiring paid professional review (tax,
consumer law, data protection). Everything engineering *can* decide is already locked as A-01…A-12
and does not appear here. The headline, argued in detail per decision and summarised in §3:
**no decision in this register blocks M0 or M1** — the first two milestones start immediately while
these are resolved in parallel.

Owner vocabulary: **client** (product/curriculum call) · **client sign-off** (engineering has a firm
recommendation; client accepts the consequence) · **professional review** (external Steuerberater /
Rechtsanwalt / data-protection specialist) · **client + professional** (both).

---

## 1. Overview

| ID | Decision | Owner | Recommendation (short) | Needed by | Gates |
|---|---|---|---|---|---|
| D-01 | M2-vs-M3 order (sell first vs teach first) | client | M2 first | end of M1 | which milestone runs third |
| D-02 | Video hosting provider + budget | client | Bunny Stream (Mux if analytics matter) | before M3 build start | M3 video lessons |
| D-03 | Cohort-based delivery: needed and when | client | not v1; keep schema-ready | before M6 planning | M6 cohort build |
| D-04 | Revoked-certificate asset handling | client sign-off | private bucket + signed URLs (A-09) | during M0 | cutover step in M0/M1 |
| D-05 | Retry cooldown values + attempt caps | client | 0 / 12 h / 24 h ladder, no cap | with M4 | M4 config values |
| D-06 | Topic floors / critical-safety question rules | client (curriculum) | no floors until pools activate | with M4 pool activation | M4 scoring rules |
| D-07 | Pricing model: one-time v1, prices/currency | client | one-time, EUR-only v1 | before M2 go-live | M2 go-live |
| D-08 | Refund policy incl. post-certificate refunds | client + professional | revoke access, never auto-revoke credential | before M2 go-live | M2 go-live |
| D-09 | Default access duration | client | 12 months | M1 (provisional default fine) | nothing (config) |
| D-10 | Support channel: mailto vs in-app inbox | client | reference-ID mailto + minimal log table | before M6 | M6 support build |
| D-11 | Instructor role timing | client | design M1, build M6 at earliest | before M6 | M6 role build |
| D-12 | GDPR retention/anonymization policy | professional review | anonymize-not-delete; primitive lands M1 regardless | before M6 program | M6 GDPR program parameters |
| D-13 | Tax/VAT + invoicing | professional review | Stripe Tax; clarify Kleinunternehmerregelung | before M2 go-live | M2 go-live |
| D-14 | AGB/Widerruf for digital-goods checkout | professional review | §356(5) BGB waiver checkbox at checkout | before M2 go-live | M2 go-live |
| D-15 | German native-speaker QA of candidate copy | client | do it once, before first public release | before first release | release sign-off only |
| D-16 | Certificate ID series code | client (low stakes) | adopt for new certificates at M5 | before M5 | M5 issuance format |
| D-17 | English (EN) activation timing | client | leave dormant; schedule cert-language work only when planned | none | deferred cert-language work |
| D-18 | Ordering + matching question types | client (curriculum) | no for v1 | before any post-M4 build | post-M4 question types |
| D-19 | Weighted question scoring activation | client (curriculum) | schema-ready, inert; don't activate | with M4 | M4 scoring semantics |
| D-20 | Admin MFA (TOTP) | client | yes, for all 3 admins, in M1 | during M1 | nothing (additive) |
| D-21 | Social share designs + format set | client | deliver designs; portrait = 1080×1350 feed format | before M5 social build | M5 social formats |
| D-22 | Existing-participant comms (claim campaign + URL cutover notice) | client | one email, two messages | M1 claim launch / D-04 cutover | comms content only |
| D-23 | Pre-course diagnostic: curriculum need + timing | client (curriculum) | confirm before M4 | before M4 | M4 diagnostic build |
| D-24 | Certificate topics language (DE topics on EN document) | client (low stakes) | make it explicit; recommend keep DE | any time (M0 docs pass) | nothing |

---

## 2. Decisions in detail

### D-01 — M2-vs-M3 order: sell first or teach first

**Question.** After M0 + M1, does M2 (Stripe commerce) or M3 (learning MVP) ship next — i.e. is the
first public release "buyable certification" or "learnable course"?

**Context.** Both milestones sit independently on M1 and neither depends on the other
(decisions-brief milestone skeleton; [07-milestone-backlog.md](07-milestone-backlog.md)). M1 already
delivers manual payments as real orders, so revenue does not strictly wait for Stripe — an admin can
grant paid access by hand from day one of M1.

**Options and consequences.**

| Option | Consequence |
|---|---|
| M2 first (engineering default) | Self-serve revenue earlier; smaller milestone, earlier win; participants buy access to a course whose learning content is still delivered outside the platform (as today). Learning waits one milestone. |
| M3 first | Course experience exists before anyone can self-serve buy it; all sales run through admin-recorded manual payments (workable at current volume, 17 participants — verified in prod 2026-08-01); Stripe waits one milestone. |

**Recommendation.** **M2 first.** It is the smaller build, it converts the manual-payment bridge into
self-serve revenue, and the client's teaching currently happens off-platform anyway — selling
certification access is the existing business, teaching in-platform is the new one.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Yes, fully: M0 and M1 are identical under either order, and
the decision is only needed when M1 nears completion. Nothing in M2 or M3 needs to be *designed*
differently based on the order.

### D-02 — Video hosting provider + budget

**Question.** Which hosted video platform carries course lessons — Mux, Bunny Stream, or Vimeo — and
what monthly budget is acceptable?

**Context.** A-07 locks *that* video is hosted externally (not Supabase Storage); the provider is
explicitly a client/cost decision. The video pipeline is the largest greenfield piece of M3 and its
provider gates the M3 build start; it is also a GDPR data-processor question (a new subprocessor
appears in the privacy policy) — capability matrix, learning: "Lesson types + participant rendering".

**Options and consequences.**

| Option | Consequence |
|---|---|
| Bunny Stream | Cheapest by a wide margin (storage + delivery pennies per GB), EU points of presence and EU-friendly posture; API adequate; player less polished, analytics basic. |
| Mux | Best developer experience, signed playback, quality analytics; usage-based pricing noticeably higher; US company (SCC paperwork for GDPR). |
| Vimeo (OTT/Pro) | Simplest non-technical upload UI; least API control, per-seat pricing, embed-oriented rather than API-oriented — fights the custom-player integration M3 wants. |

**Recommendation.** **Bunny Stream** — at this academy's scale the cost difference is structural, EU
residency simplifies D-12/DSGVO paperwork, and M3 needs only signed playback URLs + a heartbeat, all
of which Bunny provides. Choose Mux only if per-viewer analytics are a product requirement.

**Owner.** Client (budget). **Professional review:** no, but the chosen provider must be added to the
privacy policy / processor list — fold into D-12's professional pass.
**Can work continue before resolution?** M0, M1, M2 entirely. Within M3: schema, text/download
lessons, progress model and dashboards proceed; only video upload/playback wiring waits. Decide
before M3 build start to avoid a mid-milestone stall.

### D-03 — Cohort-based delivery: needed, and when

**Question.** Will the academy ever run cohorts (fixed start/end groups with scheduled releases,
group comms, exam windows), and if so, when is the earliest real need?

**Context.** Cohort mode is the heaviest untriggered feature in the learning domain (complexity XL —
capability matrix, learning: "Cohort mode"): it touches versioning, release rules, comms, roles and
exam scheduling at once. Nothing in current operations suggests cohorts: all delivery is self-paced,
17 participants, one course + one seminar (verified in prod 2026-08-01).

**Options and consequences.**

| Option | Consequence |
|---|---|
| No cohorts (or "not yet") | M6 stays lean; `enrollments.cohort_id uuid NULL` (reserved in the M1 migration at zero cost) sits unused; if the need appears later, the access backbone never needs migrating. |
| Confirm cohorts | M6 gains the `cohorts` + `cohort_module_releases` build; announcements ride the M1 jobs/email pipeline; instructor role (D-11) becomes more urgent. |

**Recommendation.** **Defer; treat as "no" until a concrete cohort (dates, group, price) exists.**
The schema reservation makes later confirmation cheap, so there is no penalty for waiting.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything through M5. The only action any milestone takes
is the M1 nullable-column reservation, which happens regardless of the answer.

### D-04 — Revoked-certificate asset handling

**Question.** Accept the recommended fix — private Storage bucket + short-lived signed URLs for
certificate PDFs/PNGs — including its one visible consequence: previously emailed public asset links
stop working?

**Context.** Today revocation flips `certificates.status` only; the pristine official PDF/PNG remain
publicly downloadable forever at stable URLs in the public `certificates` bucket
(`src/app/(dashboard)/admin/certificates/actions.ts:49-57`, `src/lib/certificate/storage.ts:12-37`;
bucket confirmed public in prod 2026-08-01). For a credentialing platform this undermines the entire
point of revocation. A-09 already locks the architecture (private bucket, dual-read window, then
cutover); what needs the client is sign-off on old links dying, because 4 of 9 certificates have been
emailed (verified in prod 2026-08-01) and those recipients hold direct URLs.

**Options and consequences.**

| Option | Consequence |
|---|---|
| Private bucket + signed URLs (recommended) | Revoked assets become unreachable; all downloads route through an authorizing endpoint; old public URLs die at cutover — a short notice to the ≤17 affected participants (see D-22) and re-download via their token link fixes everyone. |
| Keep public bucket, delete/watermark assets on revocation | Cheaper, but valid certificates stay world-downloadable by URL, regeneration re-publishes, and deletion is irreversible where a signed-URL denial is not. Weaker end state. |
| Do nothing | Revocation remains cosmetic. Not acceptable for a credential product. |

**Recommendation.** **Sign off the private-bucket path.** The blast radius is at most 17 people and a
one-paragraph email.

**Owner.** Client sign-off. **Professional review:** no.
**Can work continue before resolution?** Yes — all of M0 proceeds; engineering builds toward the
recommended path (it is also the only path that supports the M5 credential portal cleanly). Only the
final cutover step (minutes; see [06-migration-strategy.md](06-migration-strategy.md)) waits for the
sign-off, and it may complete in early M1 without holding M0's other exit criteria.

### D-05 — Retry cooldown values + attempt caps

**Question.** Confirm the cooldown ladder between failed exam attempts and whether any hard attempt
cap exists.

**Context.** Today attempts are unlimited with zero cooldown and the same questions in the same base
order every retake (randomize flags are FALSE on both live questionnaires — verified in prod
2026-08-01), so brute-forcing a pass is structurally possible. M4 introduces per-questionnaire
cooldown columns (`cooldown_minutes_first/second/subsequent`) enforced server-side at attempt start
— capability matrix, assessment: "Attempts, retries, cooldowns".

**Options and consequences.**

| Option | Consequence |
|---|---|
| Suggested ladder 0 / 12 h / 24 h, no cap (recommended) | First retry immediate (kind to honest near-misses), later retries braked; candidates always eventually pass or give up — no support cases about "locked out forever". |
| Harsher (e.g. 24 h / 7 d) or a hard cap | Stronger integrity signal, but caps create an admin-escalation workflow ("please unlock me") that does not exist and would need building. |
| No cooldowns | Status quo; brute-force remains the only integrity gap until M4 question pools land. |

**Recommendation.** **Adopt 0 / 12 h / 24 h, unlimited attempts.** Also note the named pull-forward:
a single fixed cooldown check is S-sized and can ship in M1 if exam-integrity worry predates M4 —
without pools, cooldowns are the only brute-force brake.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** All milestones. M4 builds the columns as configurable
values with the suggested defaults; the decision only fixes the numbers.

### D-06 — Topic floors / critical-safety question rules

**Question.** Should passing require per-topic minimum scores and/or correct answers on flagged
critical-safety questions, in addition to the aggregate 80 %?

**Context.** Today's exam serves **every** question across all 8 topics (44 questions, both
questionnaires at 80 % — verified in prod 2026-08-01), so a pass already requires 80 % of a fully
topic-representative set; "accidental pass via strength in unrelated topics" is structurally limited.
Floors add candidate-hostile failures ("85 % but failed"). The concern becomes real only when M4
question pools sample subsets — capability matrix, assessment: "Topic floors + critical-safety
question rules".

**Options and consequences.**

| Option | Consequence |
|---|---|
| No floors until pools activate (recommended) | Scoring stays explainable; decision re-surfaces automatically with M4 pool activation, when it actually matters. |
| Floors now | New failure mode candidates cannot predict; support burden; near-zero integrity gain while the exam is exhaustive. |
| Critical-question flag only | Cheap middle ground (a wrong answer on a flagged safety item fails the attempt); defensible for a rehab curriculum — worth considering at M4. |

**Recommendation.** **No floors for the current exhaustive exam; decide floors and the
critical-question flag together with M4 pool activation.** Schema lands ready-but-inert in M4
(`min_percentage` on selection rules, `questions.is_critical`).

**Owner.** Client (curriculum). **Professional review:** no.
**Can work continue before resolution?** Everything, including all of M4's build — only the
activation of these rules waits.

### D-07 — Pricing model confirmation: one-time payments v1, prices, currency

**Question.** Confirm v1 sells one-time course access (no subscriptions/instalments), and supply the
actual prices and currency.

**Context.** A-04 locks Stripe Checkout with one-time payments first. The `course_offers` table (one
active offer per course) needs real amounts before anything can go live; recommendation is single
currency EUR v1 — capability matrix, commerce: "Course commercial offering + Stripe Checkout".

**Options and consequences.**

| Option | Consequence |
|---|---|
| One-time, EUR only (recommended) | Simplest legal/tax surface (see D-13/D-14); matches "pay once, 12 months access" (D-09). |
| Subscriptions or instalments v1 | Materially bigger build (billing states, dunning, proration) and a bigger legal surface; nothing in the target scope demands it now. |

**Recommendation.** **Confirm one-time EUR pricing; deliver a price list per course/seminar before M2
go-live.**

**Owner.** Client. **Professional review:** no (prices themselves; tax treatment is D-13).
**Can work continue before resolution?** M0, M1 fully; M2 builds and tests entirely in Stripe test
mode with placeholder prices. Only **go-live** waits for real prices.

### D-08 — Refund policy, including post-certificate refunds

**Question.** What is the refund policy — window, conditions, and specifically what happens when a
refund is granted **after** a certificate has been issued?

**Context.** M2 wires money-state to access-state mechanically; the policy must be explicit.
Engineering's recommended wiring: full refund with no certificate issued → entitlement revoked
(access gone next request); any refund where a certificate exists → entitlement revoked or suspended
per admin choice, **certificate untouched**, order flagged `needs_review` in an admin queue — never
auto-revoke a credential for a money event (capability matrix, commerce: "Refund handling"). This
matches the locked "certificates never expire" stance: a credential attests a passed exam, which a
refund does not un-happen.

**Options and consequences.**

| Option | Consequence |
|---|---|
| Recommended policy (access follows money; credential needs a human) | Predictable automation, no risk of a robot revoking a legally meaningful credential; rare edge cases land in a review queue. |
| Auto-revoke certificate on refund | Simpler rule, but revoking credentials for payment events is reputationally and possibly legally fraught — exactly the case that needs human judgement. |
| No refunds after certificate issuance | Cleanest, but must survive D-14's consumer-law review (Widerruf rules constrain what can be excluded, though the digital-content waiver helps). |

**Recommendation.** **Adopt the recommended wiring; let the professional review (D-14's lawyer)
confirm the customer-facing policy text**, especially the interaction between the withdrawal-right
waiver and post-certificate refunds.

**Owner.** Client + professional review (Rechtsanwalt, consumer/contract law).
**Can work continue before resolution?** M0, M1, and the entire M2 build (states, webhook, queue) —
the policy only parameterises which transitions fire. Go-live waits for the confirmed policy text.

### D-09 — Default access duration

**Question.** Confirm the default course-access duration granted by a purchase or manual grant.
Proposal: **12 months**.

**Context.** Entitlements carry `expires_at` (NULL = perpetual); the default comes from
`course_offers.access_duration_days` (365) applied at activation. Access expiry is fully decoupled
from certificate validity — certificates never expire (locked decision; capability matrix, commerce:
"Access expiry + duration management"). Per-grant overrides exist for manual payments.

**Options and consequences.**

| Option | Consequence |
|---|---|
| 12 months (proposed) | Industry-normal for course access; creates a natural renewal conversation; reminder emails at 30/7/1 days ride the M2 pipeline. |
| Perpetual | Simpler, no reminders needed, but forecloses renewal revenue and makes "course version support" open-ended. |
| Shorter (e.g. 6 months) | More renewal pressure; risky for a rehab curriculum people work through slowly. |

**Recommendation.** **Adopt 12 months provisionally now.** It is a per-offer config value; changing
it later affects only future grants.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything. M1 manual grants use the provisional default
with per-grant override; nothing structural depends on the number.

### D-10 — Support channel: reference-ID mailto vs in-app inbox

**Question.** Is v1 support a stamped mailto (support email + human reference code) or an in-app
ticket inbox?

**Context.** No support surface exists on either side today. The specced linked-ticket inbox needs a
new entity plus polymorphic links to objects that partly do not exist yet (orders, payments) —
capability matrix, roles-admin: "Support workflow". Standing disposition: reference-ID mailto first.

**Options and consequences.**

| Option | Consequence |
|---|---|
| Reference-ID mailto + minimal `support_requests` log (recommended) | Ships almost free (entry point can ride M1 accounts); history accrues from day one; an external helpdesk tool can be added without schema change. |
| In-app inbox v1 | A real product feature (threading, states, notifications) for a 3-admin team with, at present, 17 participants — disproportionate until volume proves need. |

**Recommendation.** **Mailto + reference codes + log table; revisit the inbox at M6 only if volume
demands it** (an external helpdesk is cheaper than building one).

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything. The v1 entry point ships regardless; the
decision only shapes M6.

### D-11 — Instructor role timing

**Question.** When (if ever) does the instructor/mentor role — scoped to assigned courses — actually
get built?

**Context.** A-11 locks the approach: **design** in M1 (widen the role CHECK, define
`instructor_courses` + RLS predicate shapes on paper), **build** in M6 only when cohorts or
instructor headcount exist. Today there are 3 admin accounts and no instructor-shaped person
(verified in prod 2026-08-01: 1 superadmin + 2 admins).

**Options and consequences.**

| Option | Consequence |
|---|---|
| Build at M6 on demand (recommended) | Zero cost until a real instructor exists; the M1 paper design guarantees no schema migration later. |
| Build earlier | Role plumbing, scoped RLS and scoped admin chrome for a user who does not exist yet. |

**Recommendation.** **M6 at the earliest, triggered by a named instructor or confirmed cohorts
(D-03).**

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything.

### D-12 — GDPR retention/anonymization policy

**Question.** What are the retention periods and the anonymization rules for participant PII,
certificates, financial records, and the append-only history?

**Context.** Erasure today requires disabling the append-only safety trigger in the production SQL
editor (documented operational practice — exactly the untracked-drift behaviour M0 exists to kill).
Certificates and attempt snapshots embed participant names, so hard deletion is genuinely
incompatible with credential integrity; the architecture answer is **anonymize, not delete** (scrub
PII, null email, scrub history event_data, keep certificate rows). The anonymization primitive is
pulled into M1 regardless of this decision (capability-matrix challenge, roles-admin: "GDPR & privacy
program" — 17 live data subjects mean erasure obligations exist *now*). Financial records (M2) add
statutory retention (GoBD/AO: 8–10 years) that overrides erasure requests for order/invoice data.

**Options.** Not an options question — a policy document is needed: retention periods per record
class, what anonymization must scrub, how certificate permanence is justified under Art. 17(3), and
the processor list (Supabase, Vercel, Resend, Stripe, video provider per D-02).

**Recommendation.** **Commission a data-protection review before the M6 program build; do not wait
for it to ship the M1 anonymization primitive** — the primitive is strictly better than today's
trigger-disabling workaround under any conceivable policy.

**Owner.** Professional review (Datenschutz specialist / lawyer). **Professional review:** yes.
**Can work continue before resolution?** M0–M5 fully, including the M1 primitive and interim manual
runbook. Only the M6 program's parameters (retention timers, export format legalities) wait.

### D-13 — Tax/VAT + invoicing

**Question.** How is VAT handled (Stripe Tax? Kleinunternehmerregelung §19 UStG?) and what must
invoices/receipts contain?

**Context.** M2 charges real money to (mostly German) consumers for digital services. Engineering's
default is Stripe Tax so no tax logic is built in-house (A-04 adjacent; capability matrix, commerce:
"Course commercial offering"). Whether the business is kleinunternehmer (no VAT, mandatory invoice
wording) or regular (19 % USt, EU OSS questions for non-DE buyers) changes Stripe configuration, not
platform code. Manual-payment receipts in M1 are a free-text reference field; generated invoices are
post-launch and shaped by this review.

**Recommendation.** **Steuerberater review before M2 go-live; configure Stripe Tax accordingly.**

**Owner.** Professional review (Steuerberater). **Professional review:** yes.
**Can work continue before resolution?** M0, M1 fully; the whole M2 build in test mode. Go-live —
i.e. the first real charge — waits.

### D-14 — AGB/Widerruf: consumer law for digital-goods checkout

**Question.** Are the AGB, the Widerrufsbelehrung, and the checkout consent flow legally adequate for
selling digital course access to German consumers?

**Context.** The German digital-content withdrawal-right waiver (§356(5) BGB) requires explicit
consumer consent at checkout to start delivery immediately and waive the 14-day Widerruf; without it,
buyers can withdraw after consuming the course. Legal pages exist (`/impressum`, `/agb` — live,
verified 2026-08-01) but were not written for commerce. Checkout will capture a versioned AGB +
waiver consent (capability matrix, commerce). Interacts directly with D-08's refund policy.

**Recommendation.** **Lawyer review of AGB, Widerrufsbelehrung, waiver checkbox wording and impressum
adequacy for commerce, before M2 go-live.** Engineering builds the consent capture to the standard
shape in parallel.

**Owner.** Professional review (Rechtsanwalt, consumer/IT law). **Professional review:** yes.
**Can work continue before resolution?** M0, M1, M2 build. Go-live waits.

### D-15 — German native-speaker QA of candidate copy

**Question.** Has a native speaker reviewed all candidate-facing German strings — and if not, when?

**Context.** `messages.de.json` was authored by the development tooling, not a native copywriter;
`docs/multilanguage-state.md` §9 flags candidate-facing keys for client review and **no record exists
that it happened** (docs-truth audit, open questions). The platform is DE-only in production
(verified 2026-08-01), so this copy is what every real candidate reads at the highest-stakes moments
(exam, result, certificate).

**Recommendation.** **One review pass by the client (native speaker) over candidate-facing keys plus
the three email templates, before the first public release.** An hour of reading; fixes are string
edits.

**Owner.** Client. **Professional review:** no (native-speaker, not professional translator).
**Can work continue before resolution?** All engineering, all milestones. This gates release
*sign-off*, not any build.

### D-16 — Certificate ID format: adopt a series code?

**Question.** Adopt `IIS-<SERIES>-YYYY-XXXXXX` (series code + Crockford-base32 suffix) for newly
issued certificates?

**Context.** Current scheme `IIS-YYYY-XXXXXXXX` (8 random hex chars — `src/lib/certificate/issue.ts:17-21`)
already meets readable/unique/non-sequential. A series segment (e.g. `IIS-ASB-2027-7Q3K9X`) becomes
meaningful when the Advanced Joint Rehabilitation Series brings multiple certificate lines (M5).
Existing numbers are frozen in snapshots, QR codes and printed documents and must **never** be
renamed; verify-by-ID matches the raw column, so both shapes coexist free (capability matrix,
certification: "Certificate ID scheme").

**Recommendation.** **Yes, adopt at M5 for new certificates only**, sourced from a new
`courses.series_code`. Low stakes either way.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything; M5 is the only consumer.

### D-17 — English (EN) activation timing

**Question.** When, if ever, does English go live for candidates — the trigger for the deferred
certificate-language work?

**Context.** English has **never** been enabled in production (platform_settings enabled = ['de'],
all 23 attempts language 'de' — verified 2026-08-01). A-12 locks i18n as-is (DE-first, EN dormant).
The known deferred work that EN activation triggers: certificate snapshots carry no language field,
the renderer hardcodes en-GB dates, and verification chrome follows the live setting rather than a
frozen snapshot language (`src/lib/certificate/issue.ts:142-152`, `render.ts:53`; docs-truth audit —
ROADMAP's claim that these hooks exist is contradicted by code). All EN-gap consequences are
currently latent precisely because EN is off.

**Recommendation.** **Leave EN dormant; schedule the certificate-language work as a prerequisite
task in whichever milestone precedes planned activation.** Do not build it speculatively.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything — this decision has no deadline at all.

### D-18 — Ordering + matching question types

**Question.** Does the curriculum need ordering (sequence) and matching (pairing) question types?

**Context.** The entire answer pipeline is a set of option UUIDs with exact-set scoring; order and
pairing are inexpressible without the platform's first generalized response payload (jsonb) plus
typed scoring dispatch — a structural change (capability matrix, assessment: "Ordering + matching").
Exact-order scoring is brutally harsh; partial credit introduces the first non-binary scoring
semantics; nothing in the current strength/rehab item bank demonstrates sequencing/pairing pedagogy
that single/multiple choice cannot approximate.

**Recommendation.** **No for v1.** If the client confirms genuine curriculum need, build post-M4 on
top of the generalized response model, never before it.

**Owner.** Client (curriculum). **Professional review:** no.
**Can work continue before resolution?** Everything; default-no means no milestone carries this.

### D-19 — Weighted question scoring activation

**Question.** Activate per-question weights in exam scoring?

**Context.** M4 adds nullable `questions.weight` (inert, NULL = 1.0) so the schema never blocks the
decision. Challenge on record: weighting directly fights "understandable participant results" — the
score stops equalling questions-correct, which candidates and support must then explain;
topic-balanced pool selection plus a critical-question flag (D-06) deliver most of the pedagogic goal
without opaque math (capability matrix, assessment: "Weighted questions").

**Recommendation.** **Do not activate.** Revisit only alongside D-06 at pool activation.

**Owner.** Client (curriculum). **Professional review:** no.
**Can work continue before resolution?** Everything.

### D-20 — Admin MFA (TOTP)

**Question.** Require TOTP two-factor authentication for the three admin accounts?

**Context.** Admin credential lifecycle lands in M1 (reset flow, forced rotation, auth-event
logging); MFA is flagged as a client-decision secondary (capability matrix, safety-security: "Admin
credential lifecycle"). Today: no MFA, no reset flow, and superadmin-set shared-knowledge passwords
(`src/app/(dashboard)/admin/settings/admins/actions.ts:36-45`) — and admin accounts are exactly the
accounts whose compromise weaponises the stored-XSS class of bug (see [09-risk-register.md](09-risk-register.md) R-03).

**Recommendation.** **Yes — TOTP for all three admins, shipped inside M1.** Trivial user burden at
this headcount, meaningful risk reduction for a credential-issuing platform.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything; M1 ships the credential lifecycle either way
and MFA is additive.

### D-21 — Social share designs + format set

**Question.** Which social formats exist, and when do the designs arrive? Specifically: confirm the
portrait post is served by the existing `instagram_feed` 1080×1350 format (not a sixth
near-duplicate), confirm the final format list (story / feed / square / LinkedIn post / badge), and
answer whether an Invest in Strength LinkedIn company page exists (its organisation ID feeds the
Add-to-Profile deep link).

**Context.** M5 social formats are explicitly blocked on client-supplied designs (decisions-brief;
capability matrix, certification: "Social share formats" — "client has delivered zero social
designs"). The proven pipeline (designer SVG with placeholders → template CRUD → resvg render →
`certificate_assets`) is reused as-is; assets are static pre-rendered files, not dynamic renders.

**Recommendation.** **Client delivers designs during M2–M4 so M5 starts unblocked; portrait =
instagram_feed 1080×1350; supply the LinkedIn org ID (or confirm none).** Note: the LinkedIn
Add-to-Profile link itself is the cheapest high-value item in the domain (an afternoon) and can be
pulled forward without designs.

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything except the M5 social-format build itself.

### D-22 — Existing-participant communications

**Question.** Approve the two messages the 17 existing participants must receive during the
transition: (1) at M1 — "your certification record is now a claimable account" (claim invitation
explaining the new login alongside the still-working token links); (2) at the D-04 cutover — "any
previously emailed certificate-file links stop working; download fresh copies from your certificate
page".

**Context.** A-02 keeps token links working (no forced migration), but the claim campaign determines
whether accounts actually get adopted; A-09's cutover kills old public asset URLs by design
("acceptable, note in comms" — decisions-brief), and 4 of 9 certificates have been emailed with such
links (verified in prod 2026-08-01). The audience is at most 17 people; this is one client-approved
email each, not a comms programme.

**Recommendation.** **Client approves both texts when M1's claim flow is ready; engineering drafts
them.** Combine both messages into one email if the cutover lands before or with M1.

**Owner.** Client. **Professional review:** no (D-15's native-speaker pass covers the wording).
**Can work continue before resolution?** All engineering. Only the *sending* of claim invitations
and the D-04 cutover notice wait on approved text — hours, not weeks.

### D-23 — Pre-course diagnostic: curriculum need + timing

**Question.** Does the curriculum want a pre-course baseline diagnostic (non-certifying, "start
here" guidance, initial-vs-final comparison), and for which course(s)?

**Context.** M4 can deliver it cheaply: `purpose='diagnostic'` questionnaires ride the existing
assignment/attempt chain with certification suppressed; focus recommendations reuse the existing
`buildRecommendations` output; initial-vs-final comparison joins per-enrollment topic scores and
therefore needs M1 enrollments as its spine (capability matrix, assessment: "Pre-course
diagnostic"). But it only makes sense if the curriculum will actually author diagnostic item sets.

**Recommendation.** **Confirm (or drop) before M4 planning.** If confirmed, the client should also
say whether the diagnostic gates anything (recommended: purely advisory, never a gate).

**Owner.** Client (curriculum). **Professional review:** no.
**Can work continue before resolution?** Everything through M3 and the rest of M4.

### D-24 — Certificate topics language (DE topics on an English document)

**Question.** The certificate document is English by locked decision, but its topics line prints the
legacy `course_topics.title` column — German after the migration-0003 backfill. Intentional bilingual
flavour, or should newly issued certificates print English topic titles?

**Context.** `issueCertificate` selects `course_topics.title` rather than the localized columns
(`src/lib/certificate/issue.ts:88-97`), unlike every other read of that table. The certificates-email
audit flags it as "possibly intended, but inconsistent"; no doc records the intent. Snapshots are
immutable, so any change affects only future certificates — all 9 existing ones stay as issued.
Distinct from D-17: this is live behaviour today, independent of EN activation.

**Options and consequences.**

| Option | Consequence |
|---|---|
| Keep DE topics (recommended) | Zero work; topics match what German candidates studied; document the intent in the M0 docs pass so it stops resurfacing as a suspected bug. |
| Switch to EN topic titles | One-line read change + requires `title_en` to be populated for all topics (currently only maintained when EN editing is enabled — it never has been in prod). |

**Recommendation.** **Keep DE and record it as intentional** during the M0 docs truth pass, unless
the client feels the mixed-language document looks unprofessional — in which case the EN titles must
first be authored (a content task, not an engineering one).

**Owner.** Client. **Professional review:** no.
**Can work continue before resolution?** Everything.

---

### Deliberately not registered

The following conditional items need **no decision now** because standing dispositions already cover
them with zero-cost schema readiness or explicit deferral: audio-only lesson delivery (add a per-
lesson audio file only on concrete curriculum demand), drip-release variants beyond 'immediate'
(typed `release_rule` ships inert in M3), cohort-restricted coupons (unsupported by Stripe; route via
invitations if ever needed), question-bank metadata extensions, and website badge embeds. They enter
this register only if the client actively raises them.

---

## 3. Which decisions gate which milestones

"Gates go-live" means the milestone can be **built and tested in full** but not released/activated;
"gates build" means part of the milestone cannot be started.

| Milestone | Gates build | Gates go-live / exit | Effect of deciding late |
|---|---|---|---|
| **M0** | — | — (D-04 sign-off wanted during M0; the cutover step may slide to early M1 without holding other M0 exits) | None |
| **M1** | — | — (D-09 proceeds on the 12-month proposal; D-20 additive; D-22 delays only the sending of claim invites) | Days at most, on comms text |
| **M2** | — | D-07 (prices) · D-08 (refund policy text) · D-13 (tax setup) · D-14 (AGB/Widerruf) | Stripe stays in test mode until all four land |
| **M3** | D-02 (video provider — gates the video slice of the build) | — | Video lessons slip; text/download lessons, progress, dashboards unaffected |
| **M4** | — | D-05 (cooldown values) · D-06 (floors/critical flag) · D-23 (diagnostic scope) — all activation-level, defaults/inert schema otherwise | Features ship configurable with recommended defaults |
| **M5** | D-21 (social designs — gates the social-format slice only) | D-16 (ID series code) | Portal, replacement, LinkedIn link all proceed |
| **M6** | D-03 (cohorts) · D-10 (support channel) · D-11 (instructor) | D-12 (GDPR policy parameters) | M6 is shaped by these; that is by design |
| **First release** (M0+M1+M2-or-M3) | D-01 picks which of M2/M3 runs third | D-15 (German copy QA sign-off) | D-01 needed only by end of M1 |

**Punchline: nothing in this register blocks M0 or M1.** Both milestones start immediately and run
to completion on locked decisions alone. The client-decision workload for the next two milestones is
exactly four items (D-01, D-02, D-04 sign-off, D-07) plus commissioning the three professional
reviews (D-12, D-13, D-14) whose lead time — not engineering — is the likeliest schedule risk for M2
go-live. See [11-implementation-recommendation.md](11-implementation-recommendation.md) §7 for the
matching next actions, and [09-risk-register.md](09-risk-register.md) for what happens if the risks
behind D-04, D-12 and D-14 are left unmanaged.

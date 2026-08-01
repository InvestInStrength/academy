# Academy scope package

Authoritative audit + scope + migration plan for evolving the live certification platform into
the full Invest in Strength academy (learning, assessment, certification, payments, admin
operations). Produced 2026-08-01 from a full code audit, read-only live-database probes, and a
docs-vs-code reconciliation. **No production changes were made while producing this package.**

Read in this order:

| # | File | Contents |
|---|---|---|
| 0 | [00-executive-assessment.md](00-executive-assessment.md) | What exists, what's reliable/fragile/missing, direction, first boundary |
| 1 | [01-capability-matrix.md](01-capability-matrix.md) | Every requested feature vs current state, with evidence, disposition, milestone |
| 2 | [02-target-product-spec.md](02-target-product-spec.md) | Roles, journeys, course/learning/assessment/certification/payment/access models |
| 3 | [03-target-architecture.md](03-target-architecture.md) | Components, boundaries, jobs, payments, storage, email, observability, deploy flow |
| 4 | [04-data-model.md](04-data-model.md) | Entities, relationships, state machines, immutability, migration implications |
| 5 | [05-production-safety-plan.md](05-production-safety-plan.md) | Monitoring, alerts, health checks, smoke tests, reconciliation, backups, rollback |
| 6 | [06-migration-strategy.md](06-migration-strategy.md) | Per-area current→target sequences, backfills, cutovers, outage windows, rollback |
| 7 | [07-milestone-backlog.md](07-milestone-backlog.md) | M0–M6: goals, scope, acceptance criteria, verification, rollback, risks |
| 8 | [08-decision-register.md](08-decision-register.md) | Open decisions (client + professional review), recommendations, blocking status |
| 9 | [09-risk-register.md](09-risk-register.md) | Risks with likelihood/impact/detection/mitigation/recovery |
| 10 | [10-traceability-matrix.md](10-traceability-matrix.md) | Feature → requirement → entities → surfaces → tests → monitoring → milestone |
| 11 | [11-implementation-recommendation.md](11-implementation-recommendation.md) | First release, exclusions, safe order, exact next task |

Canonical shorthand used throughout:

- **M0–M6** — milestone numbers (defined in 07).
- **A-01…A-12** — locked architecture decisions (listed in 03).
- **D-xx / R-xx** — decision-register and risk-register IDs (08, 09).

Companion evidence (not in repo): per-subsystem audit reports generated during this task;
their findings are cited inline as `file:line` references which remain valid in this repo.

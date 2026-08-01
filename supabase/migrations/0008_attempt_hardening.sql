-- 0008_attempt_hardening.sql — M0 attempt-integrity hardening.
-- Apply manually in the Supabase SQL editor (same workflow as 0004–0006).
-- Scope package: docs/academy/07-milestone-backlog.md (M0) and
-- docs/academy/04-data-model.md. All changes are additive and were verified
-- safe against production data on 2026-08-01 (0 assignments with more than one
-- open attempt; 21 submitted attempts untouched by any of this).
--
-- Three protections the audit showed are app-convention-only today:
--   1. At most ONE open (unsubmitted) attempt per assignment, enforced by the
--      database instead of by the resume logic's assumptions.
--   2. Submitted attempts become immutable — except for the four attempt-
--      invalidation columns added here, which are the M4 "invalidate attempt"
--      feature's data landing early precisely so this trigger can whitelist
--      them from day one (see 07-milestone-backlog.md, backward coupling note).
--   3. DELETE of submitted attempts is deliberately NOT blocked here: the only
--      delete path is the assignment cascade, admin UI has no attempt delete,
--      and a delete guard would recreate the account_history undeletable-
--      cascade trap (see docs/academy/08-decision-register.md D-12) before the
--      GDPR anonymization design lands in M1/M6.

-- 1. One open attempt per assignment ------------------------------------------
--
-- PRE-APPLY CHECK — run this first; it must return zero rows. If it does not,
-- the very race this index prevents happened in the meantime: delete the older
-- stray open attempt(s) for the listed assignment, then re-run this file (it is
-- fully idempotent).
--
--   select certification_assignment_id, count(*)
--     from public.attempts
--    where submitted_at is null
--    group by 1
--   having count(*) > 1;

create unique index if not exists uniq_open_attempt_per_assignment
  on public.attempts (certification_assignment_id)
  where submitted_at is null;

comment on index public.uniq_open_attempt_per_assignment is
  'At most one unsubmitted attempt per assignment. The losing racer of a '
  'concurrent attempt-start gets a unique violation and resumes the winner''s '
  'row on reload (startOrResumeAttemptWith).';

-- 2. Attempt invalidation columns (data only; admin UI ships in M4) -----------

alter table public.attempts
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by_admin_id uuid
    references public.admin_profiles (id) on delete set null,
  add column if not exists invalidation_kind text
    constraint attempts_invalidation_kind_check check (
      invalidation_kind is null or invalidation_kind in (
        'technical_malfunction',
        'duplicate_submission',
        'integrity_concern',
        'administrative_error'
      )
    ),
  add column if not exists invalidation_reason text;

comment on column public.attempts.invalidated_at is
  'Set when an admin voids this attempt. The attempt row itself is preserved '
  '(original data immutable); invalidation is an overlay, never an edit.';

-- 3. Submitted attempts are immutable (invalidation columns excepted) ---------

create or replace function public.guard_attempts_update()
returns trigger
language plpgsql
as $$
begin
  -- Open attempts (autosave, finalization) are freely updatable.
  if old.submitted_at is null then
    return new;
  end if;

  -- Submitted attempts: only the four invalidation columns may change.
  if new.id is distinct from old.id
    or new.certification_assignment_id is distinct from old.certification_assignment_id
    or new.attempt_number is distinct from old.attempt_number
    or new.started_at is distinct from old.started_at
    or new.submitted_at is distinct from old.submitted_at
    or new.score_percentage is distinct from old.score_percentage
    or new.correct_count is distinct from old.correct_count
    or new.wrong_count is distinct from old.wrong_count
    or new.passed is distinct from old.passed
    or new.attempt_snapshot is distinct from old.attempt_snapshot
    or new.recommendation_snapshot is distinct from old.recommendation_snapshot
    or new.language is distinct from old.language
    or new.answers is distinct from old.answers
    or new.created_at is distinct from old.created_at
  then
    raise exception 'submitted attempts are immutable (only invalidation fields may change)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_attempts_update on public.attempts;
create trigger trg_guard_attempts_update
  before update on public.attempts
  for each row
  execute function public.guard_attempts_update();

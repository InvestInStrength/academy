-- =============================================================================
-- Invest in Strength — Certification Management Platform
-- Migration 0001: Core schema (hardened, Slice 1.5)
-- =============================================================================
-- Complete core data model. The central object is the certification ASSIGNMENT
-- (one participant <-> one questionnaire, reached through one unguessable token).
-- This is not a generic quiz app.
--
-- Security & integrity model:
--   * RLS enabled on every table; admin access gated by public.is_admin()
--     (an ACTIVE row in admin_profiles). Admin management is superadmin-only.
--   * Admins are provisioned ONLY in-app by a superadmin — there is NO auto-admin
--     trigger. The first superadmin is seeded manually (see README).
--   * account_history is append-only (insert/select policies + a hard trigger).
--   * Relational integrity (topic↔course, question↔questionnaire course) and
--     content locking (assigned questionnaires/used questions are frozen) are
--     enforced in the database, not just the app.
--   * Public/anon flows are served later via the service-role key in trusted
--     server code (bypasses RLS); there are no anon policies here.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_profiles — one row per Supabase Auth user that is an admin. Rows are
-- created only by a superadmin (no auto-provisioning). `active = false` disables
-- an admin without destroying audit trails.
-- -----------------------------------------------------------------------------
create table public.admin_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'admin' check (role in ('admin', 'superadmin')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- participants — the people being certified. Name is admin-defined and cannot be
-- changed by the participant. Email is collected before the first attempt.
-- -----------------------------------------------------------------------------
create table public.participants (
  id                        uuid primary key default gen_random_uuid(),
  full_name                 text not null,
  certificate_display_name  text,
  email                     text,
  email_confirmed           boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- course_topics — topics within a course; drive topic-level recommendations.
-- -----------------------------------------------------------------------------
create table public.course_topics (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  code        text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- questions — the reusable question bank. A question's topic (if set) must
-- belong to the same course (enforced by trigger below).
-- -----------------------------------------------------------------------------
create table public.questions (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references public.courses (id) on delete restrict,
  topic_id            uuid references public.course_topics (id) on delete set null,
  question_text       text not null,
  question_type       text not null default 'single_choice'
                        check (question_type in ('single_choice', 'multiple_choice')),
  explanation         text,
  recommendation_text text,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- question_options — answer choices. One or more may be correct.
-- -----------------------------------------------------------------------------
create table public.question_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions (id) on delete cascade,
  option_text  text not null,
  is_correct   boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- certificate_templates — SVG templates rendered into certificates (later slice).
-- -----------------------------------------------------------------------------
create table public.certificate_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  svg_template  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- questionnaires — a configured assessment for a course. Passing threshold and
-- shuffle behaviour are per questionnaire. Once a questionnaire has any
-- assignment it is "locked": scoring/structure can no longer change (trigger).
-- -----------------------------------------------------------------------------
create table public.questionnaires (
  id                       uuid primary key default gen_random_uuid(),
  course_id                uuid not null references public.courses (id) on delete restrict,
  title                    text not null,
  description              text,
  passing_percentage       integer not null default 80
                             check (passing_percentage between 0 and 100),
  randomize_question_order boolean not null default false,
  randomize_answer_order   boolean not null default false,
  active                   boolean not null default true,
  certificate_template_id  uuid references public.certificate_templates (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- questionnaire_questions — which questions are in a questionnaire, and order.
-- A question must share the questionnaire's course (trigger). Frozen once the
-- questionnaire is locked (trigger).
-- -----------------------------------------------------------------------------
create table public.questionnaire_questions (
  id                uuid primary key default gen_random_uuid(),
  questionnaire_id  uuid not null references public.questionnaires (id) on delete cascade,
  question_id       uuid not null references public.questions (id) on delete restrict,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (questionnaire_id, question_id)
);

-- -----------------------------------------------------------------------------
-- certification_assignments — THE CENTRAL OBJECT. One participant + one
-- questionnaire, reached through one unguessable token. Only one ACTIVE
-- assignment per (participant, questionnaire) — enforced by a partial index.
-- -----------------------------------------------------------------------------
create table public.certification_assignments (
  id                  uuid primary key default gen_random_uuid(),
  participant_id      uuid not null references public.participants (id) on delete restrict,
  questionnaire_id    uuid not null references public.questionnaires (id) on delete restrict,
  access_token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  status              text not null default 'not_started'
                        check (status in ('not_started', 'in_progress', 'passed', 'failed')),
  active              boolean not null default true,
  passed_at           timestamptz,
  passed_by_admin     uuid references public.admin_profiles (id) on delete set null,
  manual_pass_reason  text,
  certificate_id      uuid, -- FK added after certificates table exists
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index uniq_active_assignment_per_questionnaire
  on public.certification_assignments (participant_id, questionnaire_id)
  where active;

-- -----------------------------------------------------------------------------
-- certification_assignment_topics — topics included on this assignment's
-- certificate, selected manually per assignment. (Replaces an array column so
-- the data can be validated, ordered, and snapshotted.)
-- -----------------------------------------------------------------------------
create table public.certification_assignment_topics (
  id                          uuid primary key default gen_random_uuid(),
  certification_assignment_id uuid not null references public.certification_assignments (id) on delete cascade,
  topic_id                    uuid not null references public.course_topics (id) on delete restrict,
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now(),
  unique (certification_assignment_id, topic_id)
);

-- -----------------------------------------------------------------------------
-- attempts — every attempt is saved with a full snapshot of what was shown.
-- -----------------------------------------------------------------------------
create table public.attempts (
  id                          uuid primary key default gen_random_uuid(),
  certification_assignment_id uuid not null references public.certification_assignments (id) on delete cascade,
  attempt_number              integer not null check (attempt_number > 0),
  started_at                  timestamptz not null default now(),
  submitted_at                timestamptz,
  score_percentage            numeric(5, 2) check (score_percentage between 0 and 100),
  correct_count               integer check (correct_count >= 0),
  wrong_count                 integer check (wrong_count >= 0),
  passed                      boolean,
  attempt_snapshot            jsonb,
  recommendation_snapshot     jsonb,
  created_at                  timestamptz not null default now(),
  unique (certification_assignment_id, attempt_number)
);

-- -----------------------------------------------------------------------------
-- attempt_answers — per-question record within an attempt, fully snapshotted.
-- -----------------------------------------------------------------------------
create table public.attempt_answers (
  id                       uuid primary key default gen_random_uuid(),
  attempt_id               uuid not null references public.attempts (id) on delete cascade,
  question_id              uuid references public.questions (id) on delete set null,
  question_snapshot        jsonb not null,
  selected_option_ids      uuid[] not null default '{}',
  selected_option_snapshots jsonb,
  correct_option_ids       uuid[] not null default '{}',
  is_correct               boolean,
  displayed_question_order integer,
  displayed_option_order   jsonb,
  created_at               timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- certificates — generated on pass (later slice). Never expires; can be revoked.
-- certificate_public_snapshot freezes the data shown on the public verification
-- page so it never drifts when courses/topics/participants change.
-- -----------------------------------------------------------------------------
create table public.certificates (
  id                          uuid primary key default gen_random_uuid(),
  certification_assignment_id uuid not null unique references public.certification_assignments (id) on delete restrict,
  certificate_number          text not null unique,
  verification_token          text not null unique default encode(gen_random_bytes(24), 'hex'),
  file_url                    text,
  verification_url            text,
  certificate_public_snapshot jsonb,
  status                      text not null default 'valid' check (status in ('valid', 'revoked')),
  revoked_at                  timestamptz,
  revoked_by                  uuid references public.admin_profiles (id) on delete set null,
  revoke_reason               text,
  generated_at                timestamptz not null default now(),
  emailed_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.certification_assignments
  add constraint certification_assignments_certificate_id_fkey
  foreign key (certificate_id) references public.certificates (id) on delete set null;

-- -----------------------------------------------------------------------------
-- account_history — APPEND-ONLY audit log. Holds backend-only data (manual pass
-- reasons, revoke reasons, email/access events) never shown to participants.
-- Documented event vocabulary:
--   participant_created, email_submitted, attempt_started, attempt_submitted,
--   attempt_failed, attempt_passed, manual_pass, certificate_generated,
--   certificate_downloaded, certificate_emailed, certificate_revoked,
--   assignment_created, assignment_deactivated, assignment_reactivated,
--   access_link_regenerated
-- -----------------------------------------------------------------------------
create table public.account_history (
  id                          uuid primary key default gen_random_uuid(),
  participant_id              uuid not null references public.participants (id) on delete cascade,
  certification_assignment_id uuid references public.certification_assignments (id) on delete set null,
  event_type                  text not null,
  event_label                 text,
  event_data                  jsonb,
  created_by_admin_id         uuid references public.admin_profiles (id) on delete set null,
  created_at                  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index idx_course_topics_course on public.course_topics (course_id);
create index idx_questions_course on public.questions (course_id);
create index idx_questions_topic on public.questions (topic_id);
create index idx_question_options_question on public.question_options (question_id);
create index idx_questionnaires_course on public.questionnaires (course_id);
create index idx_qq_questionnaire on public.questionnaire_questions (questionnaire_id);
create index idx_qq_question on public.questionnaire_questions (question_id);
create index idx_assignments_participant on public.certification_assignments (participant_id);
create index idx_assignments_questionnaire on public.certification_assignments (questionnaire_id);
create index idx_assignment_topics_assignment on public.certification_assignment_topics (certification_assignment_id);
create index idx_attempts_assignment on public.attempts (certification_assignment_id);
create index idx_attempt_answers_attempt on public.attempt_answers (attempt_id);
create index idx_account_history_participant on public.account_history (participant_id);
create index idx_account_history_assignment on public.account_history (certification_assignment_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger trg_participants_updated_at before update on public.participants
  for each row execute function public.set_updated_at();
create trigger trg_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger trg_course_topics_updated_at before update on public.course_topics
  for each row execute function public.set_updated_at();
create trigger trg_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();
create trigger trg_question_options_updated_at before update on public.question_options
  for each row execute function public.set_updated_at();
create trigger trg_certificate_templates_updated_at before update on public.certificate_templates
  for each row execute function public.set_updated_at();
create trigger trg_questionnaires_updated_at before update on public.questionnaires
  for each row execute function public.set_updated_at();
create trigger trg_assignments_updated_at before update on public.certification_assignments
  for each row execute function public.set_updated_at();
create trigger trg_certificates_updated_at before update on public.certificates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Relational integrity triggers
-- -----------------------------------------------------------------------------

-- A question's topic must belong to the question's course.
create or replace function public.enforce_question_topic_course()
returns trigger
language plpgsql
as $$
begin
  if new.topic_id is not null then
    if not exists (
      select 1 from public.course_topics
      where id = new.topic_id and course_id = new.course_id
    ) then
      raise exception 'Topic % does not belong to course %', new.topic_id, new.course_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_questions_topic_course
  before insert or update on public.questions
  for each row execute function public.enforce_question_topic_course();

-- A questionnaire_question's question must share the questionnaire's course.
create or replace function public.enforce_questionnaire_question_course()
returns trigger
language plpgsql
as $$
declare
  q_course uuid;
  n_course uuid;
begin
  select course_id into q_course from public.questions where id = new.question_id;
  select course_id into n_course from public.questionnaires where id = new.questionnaire_id;
  if q_course is distinct from n_course then
    raise exception 'Question % is not in the questionnaire''s course', new.question_id;
  end if;
  return new;
end;
$$;

create trigger trg_qq_course
  before insert or update on public.questionnaire_questions
  for each row execute function public.enforce_questionnaire_question_course();

-- -----------------------------------------------------------------------------
-- Content locking: a questionnaire with any assignment is frozen, as are the
-- questions it uses. Attempts still snapshot everything; this prevents the
-- assigned content from shifting under candidates.
-- -----------------------------------------------------------------------------
create or replace function public.questionnaire_is_locked(qid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.certification_assignments where questionnaire_id = qid
  );
$$;

create or replace function public.question_is_locked(qid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.questionnaire_questions qq
    join public.certification_assignments ca on ca.questionnaire_id = qq.questionnaire_id
    where qq.question_id = qid
  );
$$;

-- Freeze the question set of a locked questionnaire.
create or replace function public.guard_questionnaire_questions()
returns trigger
language plpgsql
as $$
declare
  qid uuid := coalesce(new.questionnaire_id, old.questionnaire_id);
begin
  if public.questionnaire_is_locked(qid) then
    raise exception 'Questionnaire % is locked (has assignments); its question set cannot change', qid;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_guard_qq
  before insert or update or delete on public.questionnaire_questions
  for each row execute function public.guard_questionnaire_questions();

-- Freeze scoring/structure fields of a locked questionnaire (title/description/
-- active may still change).
create or replace function public.guard_questionnaires_update()
returns trigger
language plpgsql
as $$
begin
  if public.questionnaire_is_locked(old.id) then
    if (new.passing_percentage, new.randomize_question_order,
        new.randomize_answer_order, new.course_id)
       is distinct from
       (old.passing_percentage, old.randomize_question_order,
        old.randomize_answer_order, old.course_id) then
      raise exception 'Questionnaire % is locked; scoring/structure cannot change', old.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_questionnaire_update
  before update on public.questionnaires
  for each row execute function public.guard_questionnaires_update();

-- Freeze the options of a question used by a locked questionnaire.
create or replace function public.guard_question_options()
returns trigger
language plpgsql
as $$
declare
  qid uuid := coalesce(new.question_id, old.question_id);
begin
  if public.question_is_locked(qid) then
    raise exception 'Question % is locked (used in an assigned questionnaire); options cannot change', qid;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_guard_question_options
  before insert or update or delete on public.question_options
  for each row execute function public.guard_question_options();

-- Freeze structural fields of a locked question (active may still change).
create or replace function public.guard_questions_update()
returns trigger
language plpgsql
as $$
begin
  if public.question_is_locked(old.id) then
    if (new.question_text, new.question_type, new.course_id, new.topic_id,
        new.explanation, new.recommendation_text)
       is distinct from
       (old.question_text, old.question_type, old.course_id, old.topic_id,
        old.explanation, old.recommendation_text) then
      raise exception 'Question % is locked; only its active status can change', old.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_question_update
  before update on public.questions
  for each row execute function public.guard_questions_update();

-- account_history is append-only: block all updates and deletes (even for
-- service-role, which bypasses RLS).
create or replace function public.block_account_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'account_history is append-only';
end;
$$;

create trigger trg_account_history_immutable
  before update or delete on public.account_history
  for each row execute function public.block_account_history_mutation();

-- -----------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so internal lookups bypass RLS).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and active
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and active and role = 'superadmin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admin_profiles                  enable row level security;
alter table public.participants                    enable row level security;
alter table public.courses                         enable row level security;
alter table public.course_topics                   enable row level security;
alter table public.questions                       enable row level security;
alter table public.question_options                enable row level security;
alter table public.certificate_templates           enable row level security;
alter table public.questionnaires                  enable row level security;
alter table public.questionnaire_questions         enable row level security;
alter table public.certification_assignments       enable row level security;
alter table public.certification_assignment_topics enable row level security;
alter table public.attempts                        enable row level security;
alter table public.attempt_answers                 enable row level security;
alter table public.certificates                    enable row level security;
alter table public.account_history                 enable row level security;

-- admin_profiles: any active admin may read; only superadmins may write.
create policy admin_profiles_select on public.admin_profiles
  for select to authenticated using (public.is_admin());
create policy admin_profiles_write on public.admin_profiles
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- Admin-managed content tables: full access for active admins.
create policy admins_all on public.participants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.course_topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.question_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.certificate_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.questionnaires
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.questionnaire_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.certification_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.certification_assignment_topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.attempts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.attempt_answers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_all on public.certificates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- account_history: append-only — insert + select only (no update/delete policy).
create policy account_history_insert on public.account_history
  for insert to authenticated with check (public.is_admin());
create policy account_history_select on public.account_history
  for select to authenticated using (public.is_admin());

-- =============================================================================
-- BOOTSTRAP (run once, manually, as the postgres/service role):
--   1. Create the first admin's auth user (Authentication → Users → Add user).
--   2. Insert their superadmin profile:
--        insert into public.admin_profiles (id, email, role)
--        values ('<auth-user-uuid>', '<email>', 'superadmin');
-- There is intentionally NO trigger that auto-creates admins from auth.users.
-- =============================================================================

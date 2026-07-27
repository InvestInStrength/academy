-- 0007_seminars.sql — adds the "Seminar" certification type.
--
-- A seminar is a SINGLE EVENT that gets certified with a questionnaire in
-- exactly the same way as a course, so it reuses the entire
--   courses → course_topics → questions → questionnaires
--          → certification_assignments → attempts → certificates
-- chain unchanged. Only two things differ, and both live on `courses`:
--
--   * `kind`       — 'course' | 'seminar'. Selects which built-in certificate
--                    template is rendered at issue time (course wording talks
--                    about modules; seminar wording talks about the event).
--   * `event_date` — the day the seminar was held. Printed on the seminar
--                    certificate; meaningless for a multi-module course.
--
-- One further difference is enforced in application code rather than here: a
-- seminar's topics are never printed on its certificate (no
-- certification_assignment_topics are read for it). Seminars may still HAVE
-- topics — they drive the per-topic learning recommendations a candidate sees
-- after a failed attempt.
--
-- `kind` is treated as immutable after creation by the admin UI (the server
-- action never writes it on update), so a record cannot silently move between
-- the /admin/courses and /admin/seminars sections.

alter table public.courses
  add column if not exists kind text not null default 'course',
  add column if not exists event_date date;

alter table public.courses
  drop constraint if exists courses_kind_check;
alter table public.courses
  add constraint courses_kind_check check (kind in ('course', 'seminar'));

-- An event date is meaningless for a multi-module course — keep it honest so a
-- stray write can't leave a course carrying a date its certificate ignores.
alter table public.courses
  drop constraint if exists courses_event_date_kind_check;
alter table public.courses
  add constraint courses_event_date_kind_check
    check (kind = 'seminar' or event_date is null);

-- Both admin list pages filter on kind.
create index if not exists courses_kind_idx on public.courses (kind);

comment on column public.courses.kind is
  'course = multi-module programme, seminar = single event. Selects the certificate template at issue time.';
comment on column public.courses.event_date is
  'Seminar only: the day the event was held. Printed on the seminar certificate. Null for courses (enforced by courses_event_date_kind_check).';

-- -----------------------------------------------------------------------------
-- Per-seminar certificate artwork.
--
-- Each seminar ships its own designed SVG (the seminar name, its series and its
-- number are part of the artwork, not data), so the template belongs to the
-- seminar rather than to one particular test of it. `questionnaires
-- .certificate_template_id` stays as the narrower override; issue-time
-- resolution is:
--
--   questionnaire.certificate_template_id      (most specific)
--     → course.certificate_template_id         (the seminar's own artwork)
--       → built-in template for courses.kind   (fallback)
-- -----------------------------------------------------------------------------
alter table public.courses
  add column if not exists certificate_template_id uuid
    references public.certificate_templates (id) on delete set null;

comment on column public.courses.certificate_template_id is
  'Certificate artwork for this course/seminar. Overridden by questionnaires.certificate_template_id; falls back to the built-in template for `kind`.';

-- RLS: `courses` already has the admin-only policy from 0001_core_schema.sql
-- and it is column-agnostic, so the new columns are covered with no change.

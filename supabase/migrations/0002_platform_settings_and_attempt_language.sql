-- 0002_platform_settings_and_attempt_language.sql
--
-- Slice 7a: Multilanguage foundation (German-first).
-- See: docs/slice-7a-plan.md, docs/codex-audit-multilanguage.md
--
-- Adds the typed single-row `platform_settings` table that drives the
-- multilanguage feature flag, plus a `language` column on `attempts` so an
-- in-progress attempt freezes its language at start.
--
-- ASCII-only by design: pasting into the Supabase SQL editor must survive
-- copy/paste pipelines that mangle non-ASCII punctuation (e.g. em-dashes).
-- Idempotent so a partial-application re-run is safe.

set search_path = public;

-- platform_settings: single-row table holding global product toggles.
create table if not exists public.platform_settings (
  id                 boolean primary key default true check (id = true),
  active_language    text     not null default 'de',
  enabled_languages  text[]   not null default array['de'],
  updated_at         timestamptz not null default now(),
  -- Supported set: extend this CHECK and the attempts CHECK below in lockstep
  -- when adding locales.
  constraint platform_settings_languages_supported
    check (enabled_languages <@ array['de','en']::text[]),
  constraint platform_settings_languages_nonempty
    check (cardinality(enabled_languages) > 0),
  constraint platform_settings_active_supported
    check (active_language = any(array['de','en']::text[])),
  constraint platform_settings_active_in_enabled
    check (active_language = any(enabled_languages))
);

-- Seed the single row. Idempotent.
insert into public.platform_settings (id) values (true)
  on conflict (id) do nothing;

drop trigger if exists trg_platform_settings_updated_at on public.platform_settings;
create trigger trg_platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

-- Read: anon + authenticated. Candidate flow reads via service-role anyway,
-- but letting anon read keeps the table observable without revealing more
-- than the active locale identifier.
drop policy if exists "platform_settings_read_any" on public.platform_settings;
create policy "platform_settings_read_any"
  on public.platform_settings
  for select to anon, authenticated
  using (true);

-- Write: superadmin only.
drop policy if exists "platform_settings_update_superadmin" on public.platform_settings;
create policy "platform_settings_update_superadmin"
  on public.platform_settings
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
-- No insert/delete policies. Service-role bypasses RLS for the migration's
-- seed insert; subsequent inserts/deletes from app code are blocked, which is
-- correct for a single-row settings table.

-- attempts.language: frozen at attempt start.
alter table public.attempts
  add column if not exists language text not null default 'de'
    constraint attempts_language_supported
      check (language = any(array['de','en']::text[]));

comment on column public.attempts.language is
  'Language captured at attempt start from platform_settings.active_language. Frozen for the lifetime of the attempt; mid-flight platform toggles do not change it.';

set search_path = public;

create table if not exists public.platform_settings (
  id                 boolean primary key default true check (id = true),
  active_language    text     not null default 'de',
  enabled_languages  text[]   not null default array['de'],
  updated_at         timestamptz not null default now(),
  constraint platform_settings_languages_supported
    check (enabled_languages <@ array['de','en']::text[]),
  constraint platform_settings_languages_nonempty
    check (cardinality(enabled_languages) > 0),
  constraint platform_settings_active_supported
    check (active_language = any(array['de','en']::text[])),
  constraint platform_settings_active_in_enabled
    check (active_language = any(enabled_languages))
);

insert into public.platform_settings (id) values (true)
  on conflict (id) do nothing;

drop trigger if exists trg_platform_settings_updated_at
  on public.platform_settings;
create trigger trg_platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_read_any"
  on public.platform_settings;
create policy "platform_settings_read_any"
  on public.platform_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "platform_settings_update_superadmin"
  on public.platform_settings;
create policy "platform_settings_update_superadmin"
  on public.platform_settings
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.attempts
  add column if not exists language text not null default 'de'
    constraint attempts_language_supported
      check (language = any(array['de','en']::text[]));

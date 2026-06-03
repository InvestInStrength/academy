-- Slice 6 - Certificate Output System (MVP: official PDF + PNG preview).
-- Append-only. Apply manually in the Supabase SQL editor (paste SQL only).
-- ASCII only; no em-dashes (keeps copy-paste safe).

-- 1. Per-certificate rendered assets (one current row per type; regen overwrites).
create table if not exists public.certificate_assets (
  id              uuid primary key default gen_random_uuid(),
  certificate_id  uuid not null references public.certificates(id) on delete cascade,
  asset_type      text not null check (asset_type in (
                    'official_pdf','official_png_preview','instagram_story_png',
                    'instagram_feed_png','instagram_square_png')),
  file_url        text not null,
  mime_type       text not null,
  width           integer,
  height          integer,
  file_size       integer,
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (certificate_id, asset_type)
);

create index if not exists certificate_assets_certificate_id_idx
  on public.certificate_assets (certificate_id);

-- 2. RLS: admin-only via the existing is_admin() helper. Public surfaces read
--    assets through the Storage public URL, never through anon SQL.
alter table public.certificate_assets enable row level security;

create policy admins_all on public.certificate_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. Typed templates (forward-compatible with the deferred Instagram formats).
alter table public.certificate_templates
  add column if not exists template_type text not null default 'official_certificate'
    check (template_type in (
      'official_certificate','instagram_story','instagram_feed','instagram_square')),
  add column if not exists width integer,
  add column if not exists height integer;

-- 4. Storage bucket 'certificates' is created in the dashboard (public). See
--    docs/slice-6-apply-checklist.md. certificates.file_url is deprecated by
--    certificate_assets; left in place, unused.

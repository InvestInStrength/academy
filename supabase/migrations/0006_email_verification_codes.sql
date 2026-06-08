-- Candidate email verification via one-time 6-digit codes (OTP).
-- Append-only. Apply manually in the Supabase SQL editor (paste SQL only).
-- ASCII only; no em-dashes (keeps copy-paste safe).
--
-- Before this, the candidate flow trusted whatever email was typed on the hub
-- (email_confirmed was set true the moment it was submitted). We now email a
-- short code and only set email_confirmed once the candidate types it back.
-- This table holds the short-lived codes. Only a SHA-256 hash of the code is
-- stored, never the plaintext. Rows are single-use (consumed_at) and short
-- lived (expires_at). The candidate flow reaches this table only through the
-- service-role client, which bypasses RLS, so no anon policy is needed.

create table if not exists public.email_verification_codes (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants (id) on delete cascade,
  email           text not null,
  code_hash       text not null,
  attempts        integer not null default 0,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_email_verification_participant
  on public.email_verification_codes (participant_id);

alter table public.email_verification_codes enable row level security;

-- Admins may read the codes table for audit/debugging; nobody writes through
-- RLS (the candidate flow uses the service-role client, which bypasses RLS).
drop policy if exists admins_read on public.email_verification_codes;
create policy admins_read on public.email_verification_codes
  for select using (public.is_admin());

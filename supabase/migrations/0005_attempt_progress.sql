-- Persist partial attempt progress.
-- Append-only. Apply manually in the Supabase SQL editor (paste SQL only).
-- ASCII only; no em-dashes (keeps copy-paste safe).
--
-- A candidate answers questions client-side in the paginated attempt form.
-- Before this column, a mid-attempt reload or connection blip wiped every
-- in-page answer. We now persist the working answer map on the in-progress
-- attempt row so the form can hydrate it back on the next render.
--
-- Shape: { "<question_id>": ["<option_id>", ...], ... }. It is a working draft
-- only; the authoritative per-question snapshot is still written at submit time
-- into attempt_answers. Nullable: existing and freshly created rows have none.

alter table public.attempts
  add column if not exists answers jsonb;

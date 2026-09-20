-- DSA Vault — lets a problem carry links the user attaches themselves.
-- Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)
--
-- `custom_link` already held one URL, which replaces the sheet's article. These
-- add two more slots for a problem link and a video the user attaches themselves,
-- both shown alongside the sheet's own links rather than hiding any.
--
-- Additive and nullable: existing rows are untouched and a null simply means
-- "nothing attached". Safe to re-run — `if not exists` makes each a no-op once
-- the column is there.
alter table public.user_problems
  add column if not exists custom_practice_link text;

alter table public.user_problems
  add column if not exists custom_video_link text;

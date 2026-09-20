-- DSA Vault — lets a problem carry a second user-supplied link.
-- Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)
--
-- `custom_link` already held one URL, which replaces the sheet's article. This
-- adds a second slot for a practice/problem link the user attaches themselves,
-- shown alongside the sheet's own TUF and LeetCode links rather than hiding one.
--
-- Additive and nullable: existing rows are untouched and a null simply means
-- "no custom problem link".
alter table public.user_problems
  add column if not exists custom_practice_link text;

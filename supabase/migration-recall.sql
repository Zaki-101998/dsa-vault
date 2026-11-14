-- DSA Vault — recall grades + per-problem revision windows.
-- Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)
--
-- `recall` is how well the approach came back the last time a problem was
-- revised: 'red' (blank), 'yellow' (fuzzy) or 'green' (got it). `interval_days`
-- is that problem's own "red in N days" window, set from the grade — see
-- lib/schedule.ts. Until a problem has been graded both stay null and it keeps
-- using the global decay_days from user_settings, exactly as before.
--
-- Additive and nullable: existing rows are untouched. Safe to run twice.
-- No RLS change is needed — the user_problems policies already cover new columns.
-- (rev_log needs no change either: it is jsonb, and graded revisions are simply
-- stored as objects alongside the older bare-timestamp entries.)
alter table public.user_problems
  add column if not exists recall text,
  add column if not exists interval_days numeric;

alter table public.user_problems
  drop constraint if exists user_problems_recall_check;
alter table public.user_problems
  add constraint user_problems_recall_check
  check (recall is null or recall in ('red', 'yellow', 'green'));

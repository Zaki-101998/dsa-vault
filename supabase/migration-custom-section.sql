-- DSA Vault — lets a problem sit in a subsection you choose.
-- Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)
--
-- `custom_topic` already says which step a problem belongs to; this says which
-- subsection within it. Like the other custom_* fields it overrides the sheet for
-- ANY problem, not just ones you added — so a seed problem can be moved too.
--
-- Additive and nullable: existing rows are untouched, and a null means "wherever
-- the sheet puts it", or for a problem you added, loose at the top of its step.
alter table public.user_problems
  add column if not exists custom_section text;

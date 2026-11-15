-- DSA Vault — focus topic for the daily revision planner.
-- Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)
--
-- `focus` holds the topic being revised right now as one JSON object:
--   { "stepKey": "...", "startedAt": "<ISO time>", "budgetMin": 60 }
-- See Focus in lib/types.ts and lib/plan.ts. Null means no topic is running.
--
-- Additive and nullable: existing rows are untouched. Safe to run twice.
-- No RLS change is needed — the user_settings policies already cover new columns.
alter table public.user_settings
  add column if not exists focus jsonb;

-- To confirm it worked (expect one row: focus | jsonb | YES):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name = 'user_settings'
--     and column_name = 'focus';
--
-- To undo (this deletes the saved topic):
--   alter table public.user_settings drop column if exists focus;

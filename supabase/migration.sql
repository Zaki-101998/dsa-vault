-- DSA Vault — run this once in your Supabase project's SQL editor.
-- Dashboard: your project → SQL Editor → New query → paste this whole file → Run.

create extension if not exists "pgcrypto";

create table if not exists public.user_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_key text not null,
  custom_name text,
  custom_topic text,
  custom_link text,
  status text not null default 'Unsolved' check (status in ('Unsolved', 'Attempted', 'Solved')),
  starred boolean not null default false,
  last_revised timestamptz,
  rev_count integer not null default 0,
  rev_log jsonb not null default '[]'::jsonb,
  notes_html text not null default '',
  approaches jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, problem_key)
);

create index if not exists user_problems_user_id_idx on public.user_problems (user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  decay_days integer not null default 5 check (decay_days between 1 and 30),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh on every write
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_problems_set_updated_at on public.user_problems;
create trigger user_problems_set_updated_at
  before update on public.user_problems
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Row Level Security: every user can only ever touch their own rows.
alter table public.user_problems enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "select own problems" on public.user_problems;
create policy "select own problems" on public.user_problems
  for select using (auth.uid() = user_id);

drop policy if exists "insert own problems" on public.user_problems;
create policy "insert own problems" on public.user_problems
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own problems" on public.user_problems;
create policy "update own problems" on public.user_problems
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own problems" on public.user_problems;
create policy "delete own problems" on public.user_problems
  for delete using (auth.uid() = user_id);

drop policy if exists "select own settings" on public.user_settings;
create policy "select own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own settings" on public.user_settings;
create policy "insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own settings" on public.user_settings;
create policy "update own settings" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

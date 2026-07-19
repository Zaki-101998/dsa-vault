-- DSA Vault — daily TODO list. Run this once in your Supabase project's SQL editor.
-- (Separate from migration.sql so you don't need to re-run that file.)

create table if not exists public.user_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  due_date date not null,       -- the day this item is currently planned for
  original_date date not null,  -- the day it was first planned; never changed by carry-forward
  done boolean not null default false,
  done_at timestamptz,
  problem_key text,             -- optional link to a sheet/custom problem
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_todos_user_due_idx on public.user_todos (user_id, due_date);

drop trigger if exists user_todos_set_updated_at on public.user_todos;
create trigger user_todos_set_updated_at
  before update on public.user_todos
  for each row execute function public.set_updated_at();

alter table public.user_todos enable row level security;

drop policy if exists "select own todos" on public.user_todos;
create policy "select own todos" on public.user_todos
  for select using (auth.uid() = user_id);

drop policy if exists "insert own todos" on public.user_todos;
create policy "insert own todos" on public.user_todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own todos" on public.user_todos;
create policy "update own todos" on public.user_todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own todos" on public.user_todos;
create policy "delete own todos" on public.user_todos
  for delete using (auth.uid() = user_id);

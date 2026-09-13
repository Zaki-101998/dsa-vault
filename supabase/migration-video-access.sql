-- Video-link allowlist.
--
-- The lecture videos live in private Google Drive folders. Drive itself is the
-- real access control; this table only decides whether the app *renders* a link,
-- so nobody is shown a dead "Request access" page. Treat it as a UX gate, never
-- as authorization — a spoofed client still cannot open a file Drive won't serve.
--
-- Adding someone is two steps, and both are needed:
--   1. share the Drive folder with them in Google Drive
--   2. add their email here (the sidebar's "Video access" box does this)

create table if not exists public.video_access (
  email text primary key,
  -- Owners can see and edit the whole list from inside the app.
  is_owner boolean not null default false,
  added_at timestamptz not null default now()
);

alter table public.video_access enable row level security;

-- SECURITY DEFINER so the policies below can consult this table without the
-- policy recursing into itself.
create or replace function public.is_video_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.video_access
    where lower(email) = lower(auth.jwt() ->> 'email')
      and is_owner
  );
$$;

revoke all on function public.is_video_admin() from public;
grant execute on function public.is_video_admin() to authenticated;

-- Everyone may check their own access; owners may read the whole list to manage it.
drop policy if exists "read own or all when owner" on public.video_access;
create policy "read own or all when owner" on public.video_access
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email) or public.is_video_admin());

drop policy if exists "owner inserts" on public.video_access;
create policy "owner inserts" on public.video_access
  for insert to authenticated with check (public.is_video_admin());

drop policy if exists "owner updates" on public.video_access;
create policy "owner updates" on public.video_access
  for update to authenticated
  using (public.is_video_admin()) with check (public.is_video_admin());

drop policy if exists "owner deletes" on public.video_access;
create policy "owner deletes" on public.video_access
  for delete to authenticated using (public.is_video_admin());

-- Seed the first owner. Run this once from the Supabase SQL editor, which runs
-- as a superuser and so bypasses the policies above (they would otherwise block
-- the very first insert — there is no owner yet to authorise it).
-- Replace the address if the vault changes hands.
insert into public.video_access (email, is_owner)
values ('zakibhatkar57@gmail.com', true)
on conflict (email) do update set is_owner = true;

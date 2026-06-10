-- 2026-06-10  Session 5, Sitting 5c (or next)
-- Feature: social worker access (read-only, per-child).
--
-- Part 1: the link table. A social worker (profiles.role = 'social_worker')
-- is assigned to specific children. One SW -> many children, across any home;
-- one child -> potentially many SWs. Admin-only assignment.
--
-- 'social_worker' is just a new value in profiles.role (text) — no enum change.
--
-- Rollback:
--   drop table if exists public.child_social_workers;

create table if not exists public.child_social_workers (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  social_worker_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (child_id, social_worker_id)
);

-- Helpful indexes for the lookups RLS will do
create index if not exists idx_csw_social_worker on public.child_social_workers(social_worker_id);
create index if not exists idx_csw_child on public.child_social_workers(child_id);

-- ============================================================
-- Part 2: RLS on the link table + chapters read policy for SWs
-- ============================================================
-- (Applied live in Supabase; recorded here.)

alter table public.child_social_workers enable row level security;

create policy csw_admin_all on public.child_social_workers
  for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy csw_self_select on public.child_social_workers
  for select
  using (social_worker_id = auth.uid());

-- A social worker may read PUBLISHED chapters for their ASSIGNED children only.
create policy chapters_social_worker_select
on public.chapters
for select
using (
  current_user_role() = 'social_worker'
  and status = 'published'
  and exists (
    select 1 from public.child_social_workers csw
    where csw.child_id = chapters.child_id
      and csw.social_worker_id = auth.uid()
  )
);

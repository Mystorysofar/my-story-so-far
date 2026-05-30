-- 2026-05-30  Session 5, Sitting 5b
-- Fix: managers and staff could not see other users in their own home.
--
-- Root cause: the profiles table had only two SELECT policies —
--   profiles_admin_select  (role = 'admin')
--   profiles_self_select   (id = auth.uid())
-- so a non-admin could only ever read their own row. There was no
-- policy granting managers/staff visibility of their own home's roster.
--
-- This migration is ADDITIVE. It does not alter the existing admin/self
-- policies. Children are intentionally excluded — a child must not be
-- able to read their home's staff/child list.
--
-- Rollback:
--   drop policy profiles_samehome_select on public.profiles;
--   drop function public.current_user_home();

-- 1. Helper: caller's own home_id. SECURITY DEFINER avoids RLS recursion
--    (same pattern as the existing current_user_role() helper).
create or replace function public.current_user_home()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select home_id from public.profiles where id = auth.uid()
$$;

-- 2. New read policy: managers and staff may see profiles in their own home.
create policy profiles_samehome_select
on public.profiles
for select
using (
  current_user_role() in ('manager', 'staff')
  and home_id is not null
  and home_id = current_user_home()
);

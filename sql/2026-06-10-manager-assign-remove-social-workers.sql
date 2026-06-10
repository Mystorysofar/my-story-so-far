-- 2026-06-10 manager assign/remove of social workers (child in own home)
-- Mirrors the proven chapters_delete join pattern; uses current_user_home_id()
-- (the helper every working data policy uses).
-- Applied live in Supabase SQL Editor on 2026-06-10 (Session 5, Sitting 5e).

-- INSERT: a manager may link a SW to a child in their own home.
create policy csw_manager_insert
on public.child_social_workers
for insert
with check (
  current_user_role() = 'manager'
  and exists (
    select 1 from public.children c
    where c.id = child_social_workers.child_id
      and c.home_id = current_user_home_id()
  )
);

-- DELETE: a manager may remove a SW link for a child in their own home.
create policy csw_manager_delete
on public.child_social_workers
for delete
using (
  current_user_role() = 'manager'
  and exists (
    select 1 from public.children c
    where c.id = child_social_workers.child_id
      and c.home_id = current_user_home_id()
  )
);

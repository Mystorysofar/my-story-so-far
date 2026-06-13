-- Social worker SELECT policy on children.
-- A social worker may read a child row ONLY if that child is assigned to them
-- via the child_social_workers link table. Scoped by ASSIGNMENT, not by home,
-- so a SW sees their caseload across any number of homes/providers — and nothing
-- else, even other children in those same homes.
--
-- Fixes a latent bug: before this, no SW policy existed on `children`, so RLS
-- denied all rows and a freshly-loaded SW session saw "No children assigned yet"
-- even with active assignments (the stories view is driven by the children list).
-- Proven 2026-06-13: SW Flash Test (assigned Levent@The Vale + Probe Assigned@Buckingham)
-- reads exactly those two and NOT Probe Unassigned (same home as the latter).

create policy children_social_worker_select
on children for select
to authenticated
using (
  current_user_role() = 'social_worker'
  and exists (
    select 1 from child_social_workers csw
    where csw.child_id = children.id
      and csw.social_worker_id = auth.uid()
  )
);

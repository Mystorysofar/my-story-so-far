-- 2026-06-10  Session 5, Sitting 5c
-- Priority 2: enforce that only admin, or a manager in the child's home,
-- may change a chapter's status (approve / publish / unpublish).
--
-- Status lives in the same table as the content staff legitimately edit,
-- so a blanket UPDATE restriction would break staff editing. Instead this
-- trigger guards ONLY the status column: it fires on status changes and
-- leaves all other edits (content, insights, title, etc.) untouched.
--
-- Mirrors the existing chapters_update policy logic (admin OR manager-in-home),
-- using current_user_home_id() to match the other chapters policies.
--
-- Rollback:
--   drop trigger chapters_status_guard on public.chapters;
--   drop function public.enforce_chapter_status_change();

create or replace function public.enforce_chapter_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Only act when status is actually changing.
  if new.status is distinct from old.status then
    -- Admin may always change status.
    if current_user_role() = 'admin' then
      return new;
    end if;
    -- Manager may change status only for a child in their own home.
    if current_user_role() = 'manager'
       and exists (
         select 1 from public.children c
         where c.id = new.child_id
           and c.home_id = current_user_home_id()
       ) then
      return new;
    end if;
    -- Everyone else (staff, child, manager from another home) is refused.
    raise exception 'Only an admin or a manager in the child''s home can change a chapter status';
  end if;

  return new;
end;
$$;

create trigger chapters_status_guard
before update on public.chapters
for each row
execute function public.enforce_chapter_status_change();

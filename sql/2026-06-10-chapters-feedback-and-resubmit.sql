-- 2026-06-10  Session 5, Sitting 5c
-- Feature: "Send back for changes" review loop.
--
-- Adds feedback fields so a manager can decline a chapter back to staff with
-- a note, and introduces a 'changes_requested' status. Staff may then edit
-- and resubmit (changes_requested -> pending).
--
-- Part 1 of 2: schema (this file).
-- Part 2 (separate file): update enforce_chapter_status_change() so staff
-- can perform ONLY the changes_requested -> pending resubmit transition,
-- while all other status changes remain admin/manager-in-home only.
--
-- Rollback (part 1):
--   alter table public.chapters
--     drop column if exists feedback_note,
--     drop column if exists feedback_by,
--     drop column if exists feedback_at;

alter table public.chapters
  add column if not exists feedback_note text,
  add column if not exists feedback_by uuid references public.profiles(id),
  add column if not exists feedback_at timestamptz;

-- ============================================================
-- Part 2 of 2: trigger update — allow staff resubmit transition
-- ============================================================
-- Replaces enforce_chapter_status_change() to add ONE narrow exception:
-- a staff member in the child's home may change status, but ONLY from
-- 'changes_requested' -> 'pending' (resubmitting after edits). All other
-- status changes by staff (or anyone non-admin/non-manager) stay blocked.
--
-- Rollback (part 2): re-apply the previous version from
--   sql/2026-06-10-chapters-status-guard-trigger.sql

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
    -- Staff may ONLY resubmit: changes_requested -> pending, in their own home.
    if current_user_role() = 'staff'
       and old.status = 'changes_requested'
       and new.status = 'pending'
       and exists (
         select 1 from public.children c
         where c.id = new.child_id
           and c.home_id = current_user_home_id()
       ) then
      return new;
    end if;
    -- Everyone else / every other transition is refused.
    raise exception 'Only an admin or a manager in the child''s home can change a chapter status (staff may only resubmit a sent-back chapter)';
  end if;

  return new;
end;
$$;

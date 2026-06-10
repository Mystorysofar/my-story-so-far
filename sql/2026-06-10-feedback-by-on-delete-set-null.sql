-- 2026-06-10  Session 5, Sitting 5c
-- Fix: deleting a user failed ("Database error deleting user") when a chapter's
-- feedback_by referenced that user. The feedback_by FK (added earlier today)
-- defaulted to ON DELETE RESTRICT, blocking deletion of any manager/admin who
-- had ever sent a chapter back.
--
-- Fix: drop and re-add the FK with ON DELETE SET NULL, so deleting the user
-- blanks feedback_by on affected chapters (chapter is kept) rather than blocking.
--
-- Rollback: re-add as the default (RESTRICT) — not recommended.

alter table public.chapters
  drop constraint if exists chapters_feedback_by_fkey;

alter table public.chapters
  add constraint chapters_feedback_by_fkey
  foreign key (feedback_by) references public.profiles(id) on delete set null;

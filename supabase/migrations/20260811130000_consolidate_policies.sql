-- APPLIED TO PRODUCTION 2026-08-11.
-- Policy consolidation. Postgres evaluates EVERY permissive policy for a given
-- command and ORs the results, so a redundant policy is a per-row tax on the
-- hottest reads in the product. Net permissions are unchanged throughout.

-- Exact duplicates or strict subsets of policies that remain.
drop policy if exists "Admins can insert chapters" on public.chapters;
drop policy if exists "Admins can insert subjects" on public.subjects;
drop policy if exists "Admins can insert topics" on public.topics;
drop policy if exists "Admins can insert cutoffs" on public.college_cutoffs;
drop policy if exists "Admins can update cutoffs" on public.college_cutoffs;
drop policy if exists "Admins can delete cutoffs" on public.college_cutoffs;
drop policy if exists "Admins can insert colleges" on public.colleges;
drop policy if exists "Admins can update colleges" on public.colleges;
drop policy if exists "Admins can delete colleges" on public.colleges;
drop policy if exists "Admins can insert events" on public.counseling_events;
drop policy if exists "Admins can update events" on public.counseling_events;
drop policy if exists "Admins can delete events" on public.counseling_events;
drop policy if exists "Admins can delete any review" on public.college_reviews;
drop policy if exists "Admins can update any review" on public.college_reviews;
drop policy if exists "Users can update own review" on public.college_reviews;
drop policy if exists "Users can insert own review" on public.college_reviews;

-- Indexes that duplicated pre-existing ones under different names.
drop index if exists public.idx_questions_created_by;
drop index if exists public.idx_questions_institute_status;

-- questions carried four permissive SELECT policies plus an admin FOR ALL,
-- so five expression evaluations per row on every bank scan. Collapsed into one
-- OR'd policy with the cheapest branches first, so Postgres short-circuits
-- before it ever calls is_institute_member().
drop policy if exists "Read global approved questions" on public.questions;
drop policy if exists "Institute members read own institute approved questions" on public.questions;
drop policy if exists "Faculty read own unapproved questions" on public.questions;
drop policy if exists "Institute admins read own institute queue" on public.questions;
drop policy if exists "Admins manage questions" on public.questions;

create policy "Read visible questions" on public.questions
  for select to authenticated
  using (
    (institute_id is null and status = 'approved')
    or created_by = (select auth.uid())
    or (institute_id is not null and status = 'approved'
        and is_institute_member((select auth.uid()), institute_id))
    or (institute_id is not null
        and has_institute_role((select auth.uid()), institute_id, 'institute_admin'))
    or has_role((select auth.uid()), 'admin')
  );

create policy "Admins write questions" on public.questions
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update questions" on public.questions
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete questions" on public.questions
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

-- tests
drop policy if exists "Read global tests" on public.tests;
drop policy if exists "Institute members read own institute tests" on public.tests;
drop policy if exists "Admins manage tests" on public.tests;

create policy "Read visible tests" on public.tests
  for select to authenticated
  using (
    institute_id is null
    or is_institute_member((select auth.uid()), institute_id)
    or has_role((select auth.uid()), 'admin')
  );
create policy "Admins write tests" on public.tests
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update tests" on public.tests
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete tests" on public.tests
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

-- Remaining tables: split each admin FOR ALL policy so it stops being evaluated
-- on every SELECT. These tables' read policies already cover admins (either
-- `true`, or resolved through the parent table's own RLS).
drop policy if exists "Admins manage tq" on public.test_questions;
create policy "Admins write tq" on public.test_questions
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update tq" on public.test_questions
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete tq" on public.test_questions
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage options" on public.options;
create policy "Admins write options" on public.options
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update options" on public.options
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete options" on public.options
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage chapters" on public.chapters;
create policy "Admins write chapters" on public.chapters
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update chapters" on public.chapters
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete chapters" on public.chapters
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage topics" on public.topics;
create policy "Admins write topics" on public.topics
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update topics" on public.topics
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete topics" on public.topics
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage subjects" on public.subjects;
create policy "Admins write subjects" on public.subjects
  for insert to authenticated with check (has_role((select auth.uid()), 'admin'));
create policy "Admins update subjects" on public.subjects
  for update to authenticated
  using (has_role((select auth.uid()), 'admin'))
  with check (has_role((select auth.uid()), 'admin'));
create policy "Admins delete subjects" on public.subjects
  for delete to authenticated using (has_role((select auth.uid()), 'admin'));

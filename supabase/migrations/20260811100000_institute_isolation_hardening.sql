-- APPLIED TO PRODUCTION 2026-08-11. Recorded here so migration history matches the DB.
-- Fixes (see docs/security-audit-2026-08-11.md):
--   F1 cross-institute read leak on questions / options / tests / test_questions
--   F2 missing base GRANTs on options / tests / test_questions
--   F3 faculty could self-approve their own question (draft -> approved)
--   F4 answer key (options.is_correct) readable by every authenticated user

create or replace function public.is_institute_member(_user_id uuid, _institute_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and institute_id = _institute_id
  )
$$;

revoke all on function public.is_institute_member(uuid, uuid) from public, anon;
grant execute on function public.is_institute_member(uuid, uuid) to authenticated;

drop policy if exists "Read questions" on public.questions;
drop policy if exists "Faculty can insert their own institute questions" on public.questions;
drop policy if exists "Faculty can update their own draft or rejected questions" on public.questions;
drop policy if exists "Institute admins can review submitted questions" on public.questions;

create policy "Read global approved questions"
  on public.questions for select to authenticated
  using (institute_id is null and status = 'approved');

create policy "Institute members read own institute approved questions"
  on public.questions for select to authenticated
  using (
    institute_id is not null
    and status = 'approved'
    and public.is_institute_member(auth.uid(), institute_id)
  );

create policy "Faculty read own unapproved questions"
  on public.questions for select to authenticated
  using (created_by = auth.uid());

create policy "Institute admins read own institute queue"
  on public.questions for select to authenticated
  using (
    institute_id is not null
    and public.has_institute_role(auth.uid(), institute_id, 'institute_admin')
  );

drop policy if exists "Read options" on public.options;

create policy "Read options for visible questions"
  on public.options for select to authenticated
  using (exists (select 1 from public.questions q where q.id = options.question_id));

revoke select on public.options from authenticated;
grant select (id, question_id, option_text, sort_order) on public.options to authenticated;
grant insert, update, delete on public.options to authenticated;

drop policy if exists "Read tests" on public.tests;

create policy "Read global tests"
  on public.tests for select to authenticated
  using (institute_id is null);

create policy "Institute members read own institute tests"
  on public.tests for select to authenticated
  using (institute_id is not null and public.is_institute_member(auth.uid(), institute_id));

drop policy if exists "Read test_questions" on public.test_questions;

create policy "Read test_questions for visible tests"
  on public.test_questions for select to authenticated
  using (exists (select 1 from public.tests t where t.id = test_questions.test_id));

grant insert on public.tests to authenticated;
grant insert on public.test_questions to authenticated;

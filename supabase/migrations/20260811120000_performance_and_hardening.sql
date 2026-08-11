-- APPLIED TO PRODUCTION 2026-08-11.
-- Performance + hardening pass driven by the Supabase advisors.
--
-- 1. auth_rls_initplan (110 policies): auth.uid() was re-evaluated once PER ROW.
--    Wrapped in scalar subqueries so it becomes a single InitPlan per query.
-- 2. unindexed_foreign_keys (25): covering indexes added.
-- 3. duplicate_index: redundant index/constraint removed.
-- 4. SECURITY DEFINER functions: anon EXECUTE revoked across the board.
--
-- Verified after each step with supabase/tests/institute_isolation_test.sql.

-- ---------- 1. RLS initplan ----------
do $$
declare r record; v_using text; v_check text; v_sql text;
begin
  for r in
    select c.relname as tbl, p.polname,
           pg_get_expr(p.polqual, p.polrelid) as qual,
           pg_get_expr(p.polwithcheck, p.polrelid) as wcheck
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (pg_get_expr(p.polqual, p.polrelid) like '%auth.uid()%'
        or pg_get_expr(p.polwithcheck, p.polrelid) like '%auth.uid()%')
  loop
    v_using := r.qual; v_check := r.wcheck;
    if v_using is not null then
      v_using := replace(v_using, 'auth.uid()', '(select auth.uid())');
      v_using := replace(v_using, '(select (select auth.uid()))', '(select auth.uid())');
    end if;
    if v_check is not null then
      v_check := replace(v_check, 'auth.uid()', '(select auth.uid())');
      v_check := replace(v_check, '(select (select auth.uid()))', '(select auth.uid())');
    end if;
    v_sql := format('alter policy %I on public.%I', r.polname, r.tbl);
    if v_using is not null then v_sql := v_sql || format(' using (%s)', v_using); end if;
    if v_check is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;
    execute v_sql;
  end loop;
end $$;

-- ---------- 2. Foreign key indexes ----------
create index if not exists idx_answers_selected_option_id on public.answers (selected_option_id);
create index if not exists idx_chapters_institute_id on public.chapters (institute_id);
create index if not exists idx_college_reviews_user_id on public.college_reviews (user_id);
create index if not exists idx_colleges_created_by on public.colleges (created_by);
create index if not exists idx_contact_settings_updated_by on public.contact_settings (updated_by);
create index if not exists idx_coupons_plan_restriction on public.coupons (plan_restriction);
create index if not exists idx_institutes_created_by on public.institutes (created_by);
create index if not exists idx_legal_pages_updated_by on public.legal_pages (updated_by);
create index if not exists idx_mentor_chat_messages_session_id on public.mentor_chat_messages (session_id);
create index if not exists idx_mentor_reviews_mentor_id on public.mentor_reviews (mentor_id);
create index if not exists idx_mentor_verification_documents_mentor_id on public.mentor_verification_documents (mentor_id);
create index if not exists idx_payments_coupon_id on public.payments (coupon_id);
create index if not exists idx_payments_subscription_id on public.payments (subscription_id);
create index if not exists idx_plans_created_by on public.plans (created_by);
create index if not exists idx_questions_reviewed_by on public.questions (reviewed_by);
create index if not exists idx_subjects_institute_id on public.subjects (institute_id);
create index if not exists idx_subscriptions_granted_by on public.subscriptions (granted_by);
create index if not exists idx_subscriptions_plan_id on public.subscriptions (plan_id);
create index if not exists idx_test_attempts_test_id on public.test_attempts (test_id);
create index if not exists idx_tests_chapter_id on public.tests (chapter_id);
create index if not exists idx_tests_institute_id on public.tests (institute_id);
create index if not exists idx_tests_topic_id on public.tests (topic_id);
create index if not exists idx_topics_institute_id on public.topics (institute_id);
create index if not exists idx_user_roles_assigned_subject_id on public.user_roles (assigned_subject_id);
create index if not exists idx_user_roles_institute_id on public.user_roles (institute_id);

-- Tenant isolation hot path: every institute-scoped RLS check hits user_roles
-- by (user_id, institute_id) via is_institute_member/has_institute_role.
create index if not exists idx_user_roles_user_institute on public.user_roles (user_id, institute_id);
create index if not exists idx_user_roles_user_role on public.user_roles (user_id, role);
create index if not exists idx_test_attempts_user_created on public.test_attempts (user_id, created_at desc);

-- ---------- 3. Duplicate index ----------
alter table public.answers drop constraint if exists answers_attempt_question_unique;

-- ---------- 4. anon lockout on SECURITY DEFINER helpers ----------
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.has_institute_role(uuid, uuid, public.app_role) from anon;
revoke execute on function public.is_institute_member(uuid, uuid) from anon;
revoke execute on function public.is_mentor_owner(uuid) from anon;
revoke execute on function public.enforce_rate_limit(text, integer, integer) from authenticated, anon;

-- NOTE: admin_upsert_question, admin_insert_question_with_options and
-- admin_set_user_role remain executable by `authenticated` ON PURPOSE. The admin
-- UI calls them from the browser with the user's own session (see
-- admin.users.$id.tsx). Each verifies has_role(auth.uid(),'admin') internally
-- and raises otherwise. Revoking EXECUTE breaks the admin panel outright --
-- this was tried and reverted. The advisor warning is informational.

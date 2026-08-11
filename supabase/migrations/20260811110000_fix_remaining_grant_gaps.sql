-- APPLIED TO PRODUCTION 2026-08-11.
-- Closes the remaining instances of the recurring missing-GRANT bug and
-- installs the detector view that makes it a query instead of an incident.

grant insert, update, delete on public.counseling_articles to authenticated;
grant delete on public.mentor_reviews to authenticated;
grant delete on public.mentors to authenticated;
grant delete on public.questions to authenticated;
grant update, delete on public.tests to authenticated;
grant update, delete on public.test_questions to authenticated;
grant delete on public.institutes to authenticated;

-- user_roles is deliberately NOT granted write access to authenticated.
-- All role mutation goes through SECURITY DEFINER functions
-- (admin_set_user_role, institute_add_faculty, institute_remove_faculty).
drop policy if exists "Admins manage roles" on public.user_roles;

-- Detector: any policy whose role lacks the base privilege that policy needs.
-- Must always return zero rows. Run after every migration.
create or replace view public.rls_grant_gaps as
with needed as (
  select c.relname as table_name,
         p.polname as policy_name,
         r.rolname as role_name,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                       when 'w' then 'UPDATE' when 'd' then 'DELETE'
                       else 'ALL' end as policy_cmd
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_roles r on r.oid = any(p.polroles)
  where n.nspname = 'public'
    and r.rolname in ('anon', 'authenticated')
)
select nd.table_name, nd.policy_name, nd.policy_cmd, nd.role_name,
       req.privilege_type as missing_privilege
from needed nd
cross join lateral (
  select unnest(
    case nd.policy_cmd
      when 'ALL' then array['SELECT','INSERT','UPDATE','DELETE']
      else array[nd.policy_cmd]
    end
  ) as privilege_type
) req
where not exists (
  select 1 from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.table_name = nd.table_name
    and g.grantee = nd.role_name and g.privilege_type = req.privilege_type
)
and not exists (
  select 1 from information_schema.column_privileges cp
  where cp.table_schema = 'public' and cp.table_name = nd.table_name
    and cp.grantee = nd.role_name and cp.privilege_type = req.privilege_type
);

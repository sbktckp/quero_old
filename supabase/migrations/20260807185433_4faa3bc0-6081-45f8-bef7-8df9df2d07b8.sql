create or replace function public.has_institute_role(_user_id uuid, _institute_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role and institute_id = _institute_id
  )
$$;

revoke all on function public.has_institute_role(uuid, uuid, app_role) from public, anon;
grant execute on function public.has_institute_role(uuid, uuid, app_role) to authenticated;
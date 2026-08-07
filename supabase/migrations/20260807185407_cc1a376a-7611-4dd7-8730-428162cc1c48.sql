create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.institutes to authenticated;
grant all on public.institutes to service_role;

alter table public.institutes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='institutes' and policyname='Super admins can manage institutes') then
    create policy "Super admins can manage institutes" on public.institutes
      for all to authenticated
      using (public.has_role(auth.uid(), 'admin'))
      with check (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

alter table public.user_roles add column if not exists institute_id uuid references public.institutes(id);

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='institutes' and policyname='Members can read their own institute') then
    create policy "Members can read their own institute" on public.institutes
      for select to authenticated
      using (id in (select ur.institute_id from public.user_roles ur where ur.user_id = auth.uid()));
  end if;
end $$;

drop trigger if exists trg_institutes_updated_at on public.institutes;
create trigger trg_institutes_updated_at before update on public.institutes
  for each row execute function public.update_updated_at_column();

alter type public.app_role add value if not exists 'faculty';
alter type public.app_role add value if not exists 'subject_coordinator';
alter type public.app_role add value if not exists 'institute_admin';

alter table public.subjects  add column if not exists institute_id uuid references public.institutes(id);
alter table public.chapters  add column if not exists institute_id uuid references public.institutes(id);
alter table public.topics    add column if not exists institute_id uuid references public.institutes(id);
alter table public.questions add column if not exists institute_id uuid references public.institutes(id);
alter table public.tests     add column if not exists institute_id uuid references public.institutes(id);
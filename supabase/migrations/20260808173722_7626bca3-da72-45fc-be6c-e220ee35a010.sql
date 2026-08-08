create table if not exists public.institute_interest_leads (
  id uuid primary key default gen_random_uuid(),
  institute_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','converted','declined')),
  created_at timestamptz not null default now()
);

grant insert on public.institute_interest_leads to anon, authenticated;
grant select, update on public.institute_interest_leads to authenticated;
grant all on public.institute_interest_leads to service_role;

alter table public.institute_interest_leads enable row level security;

create policy "Anyone can register interest" on public.institute_interest_leads
  for insert to anon, authenticated with check (true);

create policy "Admins can view interest leads" on public.institute_interest_leads
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update interest leads" on public.institute_interest_leads
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
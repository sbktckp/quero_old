create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  is_active boolean not null default true
);

grant insert on public.newsletter_subscribers to anon, authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "Admins can view subscribers" on public.newsletter_subscribers;
create policy "Admins can view subscribers" on public.newsletter_subscribers
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
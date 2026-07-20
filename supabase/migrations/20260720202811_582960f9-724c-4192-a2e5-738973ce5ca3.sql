
create table if not exists public.contact_settings (
  id boolean primary key default true,
  support_email text not null default 'support@quero.in',
  support_phone text,
  support_whatsapp text,
  support_hours_days text not null default 'Monday – Saturday',
  support_hours_time text not null default '9:00 AM – 8:00 PM (IST)',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint contact_settings_singleton check (id = true)
);

insert into public.contact_settings (id) values (true) on conflict (id) do nothing;

grant select on public.contact_settings to anon, authenticated;
grant update on public.contact_settings to authenticated;
grant all on public.contact_settings to service_role;

alter table public.contact_settings enable row level security;

drop policy if exists "Anyone can read contact settings" on public.contact_settings;
create policy "Anyone can read contact settings" on public.contact_settings
  for select to anon, authenticated using (true);

drop policy if exists "Admins can update contact settings" on public.contact_settings;
create policy "Admins can update contact settings" on public.contact_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.contact_settings_touch()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists contact_settings_touch on public.contact_settings;
create trigger contact_settings_touch before update on public.contact_settings
  for each row execute function public.contact_settings_touch();

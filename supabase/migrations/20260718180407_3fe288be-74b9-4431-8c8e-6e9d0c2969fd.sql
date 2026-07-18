
-- Colleges
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  city text,
  institution_type text not null check (institution_type in ('government','private','deemed','central')),
  nmc_recognized boolean not null default true,
  annual_fees_min numeric,
  annual_fees_max numeric,
  total_seats int4,
  hostel_available boolean not null default false,
  bond_years numeric,
  bond_amount numeric,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.colleges to authenticated;
grant all on public.colleges to service_role;
alter table public.colleges enable row level security;
create policy "colleges readable by authenticated" on public.colleges for select to authenticated using (true);
create policy "colleges admin insert" on public.colleges for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "colleges admin update" on public.colleges for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "colleges admin delete" on public.colleges for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger update_colleges_updated_at before update on public.colleges for each row execute function public.update_updated_at_column();
create index if not exists colleges_name_idx on public.colleges (lower(name));
create index if not exists colleges_state_idx on public.colleges (state);

-- Cutoffs
create table if not exists public.college_cutoffs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  counseling_body text not null check (counseling_body in ('AIQ','STATE')),
  state text,
  year int4 not null,
  round text not null check (round in ('round_1','round_2','mop_up','stray_vacancy')),
  category text not null check (category in ('general','obc','sc','st','ews','pwd')),
  quota text,
  opening_rank int4,
  closing_rank int4 not null,
  created_at timestamptz not null default now()
);
grant select on public.college_cutoffs to authenticated;
grant all on public.college_cutoffs to service_role;
alter table public.college_cutoffs enable row level security;
create policy "cutoffs readable by authenticated" on public.college_cutoffs for select to authenticated using (true);
create policy "cutoffs admin insert" on public.college_cutoffs for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "cutoffs admin update" on public.college_cutoffs for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "cutoffs admin delete" on public.college_cutoffs for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create index if not exists cutoffs_lookup_idx on public.college_cutoffs (college_id, category, year, counseling_body);

-- Counseling events
create table if not exists public.counseling_events (
  id uuid primary key default gen_random_uuid(),
  counseling_body text not null,
  title text not null,
  event_type text not null check (event_type in ('registration','choice_filling','round_1','round_2','mop_up','stray_vacancy','document_verification','reporting')),
  start_date date not null,
  end_date date,
  year int4 not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.counseling_events to authenticated;
grant all on public.counseling_events to service_role;
alter table public.counseling_events enable row level security;
create policy "events readable by authenticated" on public.counseling_events for select to authenticated using (true);
create policy "events admin insert" on public.counseling_events for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "events admin update" on public.counseling_events for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "events admin delete" on public.counseling_events for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Reviews
create table if not exists public.college_reviews (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_verified boolean not null default false,
  academics_rating int4 check (academics_rating between 1 and 5),
  hostel_rating int4 check (hostel_rating between 1 and 5),
  mess_rating int4 check (mess_rating between 1 and 5),
  faculty_rating int4 check (faculty_rating between 1 and 5),
  patient_exposure_rating int4 check (patient_exposure_rating between 1 and 5),
  campus_life_rating int4 check (campus_life_rating between 1 and 5),
  safety_rating int4 check (safety_rating between 1 and 5),
  internship_rating int4 check (internship_rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (college_id, user_id)
);
grant select, insert, update, delete on public.college_reviews to authenticated;
grant all on public.college_reviews to service_role;
alter table public.college_reviews enable row level security;
create policy "reviews readable by authenticated" on public.college_reviews for select to authenticated using (true);
create policy "reviews insert own" on public.college_reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews update own or admin" on public.college_reviews for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "reviews delete own or admin" on public.college_reviews for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create index if not exists reviews_college_idx on public.college_reviews (college_id);

-- Learning resources (admin-managed articles)
create table if not exists public.counseling_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text not null,
  category text,
  sort_order int4 not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.counseling_articles to authenticated;
grant all on public.counseling_articles to service_role;
alter table public.counseling_articles enable row level security;
create policy "articles readable by authenticated" on public.counseling_articles for select to authenticated using (is_published or public.has_role(auth.uid(),'admin'));
create policy "articles admin insert" on public.counseling_articles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "articles admin update" on public.counseling_articles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "articles admin delete" on public.counseling_articles for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger update_articles_updated_at before update on public.counseling_articles for each row execute function public.update_updated_at_column();

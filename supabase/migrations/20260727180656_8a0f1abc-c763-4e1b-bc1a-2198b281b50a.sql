alter table public.user_preferences add column if not exists academic_stage text;
drop trigger if exists lock_goal_after_onboarding on public.user_preferences;
drop function if exists public.prevent_goal_change();
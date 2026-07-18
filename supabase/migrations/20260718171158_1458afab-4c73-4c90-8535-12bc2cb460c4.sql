-- Prevent authenticated/anon from reading correct answers directly.
-- Access remains available via SECURITY DEFINER RPCs (submit_answer, get_attempt_review)
-- and admin flows (has_role admin policy still applies via SECURITY DEFINER RPCs).
REVOKE SELECT (is_correct) ON public.options FROM PUBLIC, anon, authenticated;
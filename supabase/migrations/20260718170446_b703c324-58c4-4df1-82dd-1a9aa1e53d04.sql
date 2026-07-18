REVOKE EXECUTE ON FUNCTION public.admin_upsert_question(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_insert_question_with_options(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_answer(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_attempt(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_attempt_review(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
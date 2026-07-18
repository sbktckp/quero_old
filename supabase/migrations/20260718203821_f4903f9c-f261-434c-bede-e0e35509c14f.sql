
-- 1) Rate-limit events table (write-only via SECURITY DEFINER helper)
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup ON public.rate_limit_events(user_id, action, ts DESC);

GRANT SELECT ON public.rate_limit_events TO authenticated;
GRANT ALL ON public.rate_limit_events TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits self read" ON public.rate_limit_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2) Helper: check-and-record rate limit. Raises if exceeded.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(_action text, _max int, _window_seconds int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT count(*) INTO v_count FROM public.rate_limit_events
    WHERE user_id = v_uid AND action = _action AND ts > now() - make_interval(secs => _window_seconds);
  IF v_count >= _max THEN
    RAISE EXCEPTION 'rate limit exceeded for %', _action USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.rate_limit_events(user_id, action) VALUES (v_uid, _action);
  -- opportunistic prune
  DELETE FROM public.rate_limit_events WHERE ts < now() - interval '1 hour';
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(text,int,int) TO authenticated;

-- 3) Recreate submit_answer with rate limit (30 / 10s)
CREATE OR REPLACE FUNCTION public.submit_answer(_attempt_id uuid, _question_id uuid, _option_id uuid)
 RETURNS TABLE(is_correct boolean, correct_option_id uuid, explanation text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_owner uuid; v_mode test_mode; v_submitted timestamptz;
  v_correct_id uuid; v_is_correct boolean; v_explanation text; v_test_id uuid;
BEGIN
  PERFORM public.enforce_rate_limit('submit_answer', 30, 10);

  SELECT ta.user_id, ta.mode, ta.submitted_at, ta.test_id
    INTO v_owner, v_mode, v_submitted, v_test_id
  FROM test_attempts ta WHERE ta.id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF v_submitted IS NOT NULL THEN RAISE EXCEPTION 'attempt already submitted'; END IF;

  IF NOT EXISTS (SELECT 1 FROM test_questions tq WHERE tq.test_id = v_test_id AND tq.question_id = _question_id) THEN
    RAISE EXCEPTION 'question not in this test';
  END IF;

  SELECT o.id INTO v_correct_id FROM options o WHERE o.question_id = _question_id AND o.is_correct = true LIMIT 1;
  SELECT (o.is_correct IS TRUE) INTO v_is_correct FROM options o WHERE o.id = _option_id AND o.question_id = _question_id;
  IF v_is_correct IS NULL THEN RAISE EXCEPTION 'invalid option for question'; END IF;

  INSERT INTO answers (test_attempt_id, question_id, selected_option_id, is_correct)
  VALUES (_attempt_id, _question_id, _option_id, v_is_correct)
  ON CONFLICT (test_attempt_id, question_id)
    DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id, is_correct = EXCLUDED.is_correct;

  IF v_mode = 'practice' THEN
    SELECT q.explanation INTO v_explanation FROM questions q WHERE q.id = _question_id;
    RETURN QUERY SELECT v_is_correct, v_correct_id, v_explanation;
  ELSE
    RETURN QUERY SELECT NULL::boolean, NULL::uuid, NULL::text;
  END IF;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.submit_answer(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid,uuid,uuid) TO authenticated;

-- 4) Recreate finalize_attempt with rate limit (5 / 10s)
CREATE OR REPLACE FUNCTION public.finalize_attempt(_attempt_id uuid)
 RETURNS TABLE(correct_count integer, total_questions integer, score numeric)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_owner uuid; v_total int; v_correct int; v_score numeric;
BEGIN
  PERFORM public.enforce_rate_limit('finalize_attempt', 5, 10);

  SELECT ta.user_id, ta.total_questions INTO v_owner, v_total
  FROM test_attempts ta WHERE ta.id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT COUNT(*) FILTER (WHERE a.is_correct) INTO v_correct
    FROM answers a WHERE a.test_attempt_id = _attempt_id;

  v_score := CASE WHEN v_total > 0 THEN round((v_correct::numeric / v_total) * 10000) / 100 ELSE 0 END;

  UPDATE test_attempts
     SET submitted_at = COALESCE(submitted_at, now()),
         correct_count = v_correct, score = v_score
   WHERE id = _attempt_id;

  RETURN QUERY SELECT v_correct, v_total, v_score;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.finalize_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_attempt(uuid) TO authenticated;

-- 5) Admin activity log
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_activity_log_recent ON public.admin_activity_log(created_at DESC);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read activity" ON public.admin_activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert own activity" ON public.admin_activity_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- 6) delete_my_account: cascades cleanup for the caller
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.answers a USING public.test_attempts ta
    WHERE a.test_attempt_id = ta.id AND ta.user_id = v_uid;
  DELETE FROM public.test_attempts WHERE user_id = v_uid;
  DELETE FROM public.college_reviews WHERE user_id = v_uid;
  DELETE FROM public.user_preferences WHERE user_id = v_uid;
  DELETE FROM public.subscriptions WHERE user_id = v_uid;
  DELETE FROM public.payments WHERE user_id = v_uid;
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- 1. Revoke direct read of sensitive columns
REVOKE SELECT (is_correct) ON public.options FROM anon, authenticated;
REVOKE SELECT (explanation) ON public.questions FROM anon, authenticated;

-- Keep the rest readable
GRANT SELECT (id, question_id, option_text, sort_order, created_at) ON public.options TO anon, authenticated;
GRANT SELECT (id, subject_id, chapter_id, topic_id, question_text, difficulty, year, created_at, updated_at, is_pyq, pyq_year, pyq_exam) ON public.questions TO anon, authenticated;

-- 2. submit_answer: records an answer; only reveals correctness for practice-mode or already-submitted attempts
CREATE OR REPLACE FUNCTION public.submit_answer(_attempt_id uuid, _question_id uuid, _option_id uuid)
RETURNS TABLE (is_correct boolean, correct_option_id uuid, explanation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_mode test_mode;
  v_submitted timestamptz;
  v_correct_id uuid;
  v_is_correct boolean;
  v_explanation text;
  v_test_id uuid;
BEGIN
  SELECT ta.user_id, ta.mode, ta.submitted_at, ta.test_id
    INTO v_owner, v_mode, v_submitted, v_test_id
  FROM test_attempts ta WHERE ta.id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_submitted IS NOT NULL THEN
    RAISE EXCEPTION 'attempt already submitted';
  END IF;

  -- Ensure question belongs to this test
  IF NOT EXISTS (SELECT 1 FROM test_questions tq WHERE tq.test_id = v_test_id AND tq.question_id = _question_id) THEN
    RAISE EXCEPTION 'question not in this test';
  END IF;

  -- Ensure option belongs to the question
  SELECT o.id INTO v_correct_id FROM options o WHERE o.question_id = _question_id AND o.is_correct = true LIMIT 1;
  SELECT (o.is_correct IS TRUE) INTO v_is_correct FROM options o WHERE o.id = _option_id AND o.question_id = _question_id;
  IF v_is_correct IS NULL THEN
    RAISE EXCEPTION 'invalid option for question';
  END IF;

  -- Upsert answer
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
$$;

-- Ensure upsert works: add unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'answers_attempt_question_unique'
  ) THEN
    ALTER TABLE public.answers ADD CONSTRAINT answers_attempt_question_unique UNIQUE (test_attempt_id, question_id);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.submit_answer(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, uuid, uuid) TO authenticated;

-- 3. finalize_attempt: sets submitted_at, correct_count, score from answers
CREATE OR REPLACE FUNCTION public.finalize_attempt(_attempt_id uuid)
RETURNS TABLE (correct_count int, total_questions int, score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_total int;
  v_correct int;
  v_score numeric;
BEGIN
  SELECT ta.user_id, ta.total_questions INTO v_owner, v_total
  FROM test_attempts ta WHERE ta.id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COUNT(*) FILTER (WHERE a.is_correct) INTO v_correct
    FROM answers a WHERE a.test_attempt_id = _attempt_id;

  v_score := CASE WHEN v_total > 0 THEN round((v_correct::numeric / v_total) * 10000) / 100 ELSE 0 END;

  UPDATE test_attempts
     SET submitted_at = COALESCE(submitted_at, now()),
         correct_count = v_correct,
         score = v_score
   WHERE id = _attempt_id;

  RETURN QUERY SELECT v_correct, v_total, v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_attempt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_attempt(uuid) TO authenticated;

-- 4. get_attempt_review: returns full review data only if the attempt is submitted and owned by caller
CREATE OR REPLACE FUNCTION public.get_attempt_review(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_submitted timestamptz;
  v_result jsonb;
BEGIN
  SELECT ta.user_id, ta.submitted_at INTO v_owner, v_submitted
  FROM test_attempts ta WHERE ta.id = _attempt_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_submitted IS NULL THEN
    RAISE EXCEPTION 'attempt not submitted';
  END IF;

  SELECT jsonb_agg(row_to_json(x) ORDER BY (x.sort_order)) INTO v_result
  FROM (
    SELECT tq.sort_order,
           a.id AS answer_id,
           a.is_correct,
           a.selected_option_id,
           q.id AS question_id,
           q.question_text,
           q.explanation,
           (
             SELECT jsonb_agg(jsonb_build_object(
               'id', o.id, 'option_text', o.option_text,
               'is_correct', o.is_correct, 'sort_order', o.sort_order
             ) ORDER BY o.sort_order)
             FROM options o WHERE o.question_id = q.id
           ) AS options
    FROM test_questions tq
    JOIN questions q ON q.id = tq.question_id
    LEFT JOIN answers a ON a.test_attempt_id = _attempt_id AND a.question_id = q.id
    WHERE tq.test_id = (SELECT test_id FROM test_attempts WHERE id = _attempt_id)
  ) x;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attempt_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_attempt_review(uuid) TO authenticated;

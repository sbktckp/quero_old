
-- Admin visibility on user data (existing admin manage policies already cover content tables)
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all attempts" ON public.test_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atomic bulk-insert helper (SECURITY DEFINER, admin-gated). Takes a JSON payload for one row and inserts question + its options in one transaction.
CREATE OR REPLACE FUNCTION public.admin_insert_question_with_options(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id uuid;
  v_opt jsonb;
  v_idx int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.questions (
    subject_id, chapter_id, topic_id, question_text, explanation,
    difficulty, is_pyq, pyq_year, pyq_exam
  ) VALUES (
    (_payload->>'subject_id')::uuid,
    NULLIF(_payload->>'chapter_id','')::uuid,
    NULLIF(_payload->>'topic_id','')::uuid,
    _payload->>'question_text',
    NULLIF(_payload->>'explanation',''),
    NULLIF(_payload->>'difficulty',''),
    COALESCE((_payload->>'is_pyq')::boolean, false),
    NULLIF(_payload->>'pyq_year','')::int,
    NULLIF(_payload->>'pyq_exam','')::text
  ) RETURNING id INTO v_question_id;

  FOR v_opt IN SELECT * FROM jsonb_array_elements(_payload->'options') LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.options (question_id, option_text, is_correct, sort_order)
    VALUES (v_question_id, v_opt->>'text', COALESCE((v_opt->>'is_correct')::boolean, false), v_idx);
  END LOOP;

  RETURN v_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_insert_question_with_options(jsonb) TO authenticated;

-- Admin helper: upsert question with atomic option replacement
CREATE OR REPLACE FUNCTION public.admin_upsert_question(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id uuid;
  v_opt jsonb;
  v_idx int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_question_id := NULLIF(_payload->>'id','')::uuid;
  IF v_question_id IS NULL THEN
    INSERT INTO public.questions (subject_id, chapter_id, topic_id, question_text, explanation, difficulty, is_pyq, pyq_year, pyq_exam)
    VALUES (
      (_payload->>'subject_id')::uuid,
      NULLIF(_payload->>'chapter_id','')::uuid,
      NULLIF(_payload->>'topic_id','')::uuid,
      _payload->>'question_text',
      NULLIF(_payload->>'explanation',''),
      NULLIF(_payload->>'difficulty',''),
      COALESCE((_payload->>'is_pyq')::boolean, false),
      NULLIF(_payload->>'pyq_year','')::int,
      NULLIF(_payload->>'pyq_exam','')::text
    ) RETURNING id INTO v_question_id;
  ELSE
    UPDATE public.questions SET
      subject_id = (_payload->>'subject_id')::uuid,
      chapter_id = NULLIF(_payload->>'chapter_id','')::uuid,
      topic_id = NULLIF(_payload->>'topic_id','')::uuid,
      question_text = _payload->>'question_text',
      explanation = NULLIF(_payload->>'explanation',''),
      difficulty = NULLIF(_payload->>'difficulty',''),
      is_pyq = COALESCE((_payload->>'is_pyq')::boolean, false),
      pyq_year = NULLIF(_payload->>'pyq_year','')::int,
      pyq_exam = NULLIF(_payload->>'pyq_exam','')::text,
      updated_at = now()
    WHERE id = v_question_id;
    DELETE FROM public.options WHERE question_id = v_question_id;
  END IF;

  FOR v_opt IN SELECT * FROM jsonb_array_elements(_payload->'options') LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.options (question_id, option_text, is_correct, sort_order)
    VALUES (v_question_id, v_opt->>'text', COALESCE((v_opt->>'is_correct')::boolean, false), v_idx);
  END LOOP;

  RETURN v_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_question(jsonb) TO authenticated;

-- Admin helper: set a user's single role (student/admin)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) TO authenticated;

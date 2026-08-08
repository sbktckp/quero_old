-- 1. Question workflow columns
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_status_check') THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_status_check
      CHECK (status IN ('draft','submitted','approved','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS questions_institute_status_idx ON public.questions (institute_id, status);
CREATE INDEX IF NOT EXISTS questions_created_by_idx ON public.questions (created_by);

-- 2. Faculty default subject
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS assigned_subject_id uuid REFERENCES public.subjects(id);

-- 3. RLS: extend existing questions policies (existing ones untouched)
DROP POLICY IF EXISTS "Faculty insert institute questions" ON public.questions;
CREATE POLICY "Faculty insert institute questions"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (
  institute_id IS NOT NULL
  AND public.has_institute_role(auth.uid(), institute_id, 'faculty')
  AND created_by = auth.uid()
  AND status IN ('draft','submitted')
);

DROP POLICY IF EXISTS "Faculty update own editable questions" ON public.questions;
CREATE POLICY "Faculty update own editable questions"
ON public.questions FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND institute_id IS NOT NULL
  AND public.has_institute_role(auth.uid(), institute_id, 'faculty')
  AND status IN ('draft','rejected')
)
WITH CHECK (
  created_by = auth.uid()
  AND institute_id IS NOT NULL
  AND public.has_institute_role(auth.uid(), institute_id, 'faculty')
  AND status IN ('draft','submitted')
);

DROP POLICY IF EXISTS "Faculty delete own draft questions" ON public.questions;
CREATE POLICY "Faculty delete own draft questions"
ON public.questions FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND institute_id IS NOT NULL
  AND status IN ('draft','rejected')
);

DROP POLICY IF EXISTS "Institute admins review submitted questions" ON public.questions;
CREATE POLICY "Institute admins review submitted questions"
ON public.questions FOR UPDATE TO authenticated
USING (
  institute_id IS NOT NULL
  AND public.has_institute_role(auth.uid(), institute_id, 'institute_admin')
  AND status = 'submitted'
)
WITH CHECK (
  institute_id IS NOT NULL
  AND public.has_institute_role(auth.uid(), institute_id, 'institute_admin')
  AND status IN ('approved','rejected')
);

-- Options for institute questions authored by the faculty member
DROP POLICY IF EXISTS "Faculty manage own question options" ON public.options;
CREATE POLICY "Faculty manage own question options"
ON public.options FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.questions q
  WHERE q.id = options.question_id
    AND q.created_by = auth.uid()
    AND q.institute_id IS NOT NULL
    AND q.status IN ('draft','rejected')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.questions q
  WHERE q.id = options.question_id
    AND q.created_by = auth.uid()
    AND q.institute_id IS NOT NULL
    AND q.status IN ('draft','submitted','rejected')
));

-- 4. Institute admin faculty management helpers
CREATE OR REPLACE FUNCTION public.institute_faculty_list(_institute_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_institute_role(auth.uid(), _institute_id, 'institute_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT ur.id AS role_id,
           ur.user_id,
           p.display_name,
           p.email,
           ur.assigned_subject_id,
           s.name AS subject_name,
           (SELECT count(*) FROM public.questions q
              WHERE q.created_by = ur.user_id AND q.institute_id = _institute_id) AS questions_contributed,
           (SELECT count(*) FROM public.questions q
              WHERE q.created_by = ur.user_id AND q.institute_id = _institute_id AND q.status = 'approved') AS questions_approved
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    LEFT JOIN public.subjects s ON s.id = ur.assigned_subject_id
    WHERE ur.institute_id = _institute_id AND ur.role = 'faculty'
    ORDER BY p.display_name NULLS LAST
  ) x;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.institute_add_faculty(_institute_id uuid, _email text, _subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user uuid; v_role_id uuid;
BEGIN
  IF NOT public.has_institute_role(auth.uid(), _institute_id, 'institute_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT p.id INTO v_user FROM public.profiles p
   WHERE lower(p.email) = lower(trim(_email)) LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_account');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = v_user AND ur.institute_id = _institute_id AND ur.role = 'faculty') THEN
    UPDATE public.user_roles SET assigned_subject_id = _subject_id
     WHERE user_id = v_user AND institute_id = _institute_id AND role = 'faculty'
     RETURNING id INTO v_role_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role, institute_id, assigned_subject_id)
    VALUES (v_user, 'faculty', _institute_id, _subject_id)
    RETURNING id INTO v_role_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'role_id', v_role_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.institute_remove_faculty(_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_institute uuid;
BEGIN
  SELECT institute_id INTO v_institute FROM public.user_roles WHERE id = _role_id AND role = 'faculty';
  IF v_institute IS NULL THEN RAISE EXCEPTION 'faculty role not found'; END IF;
  IF NOT public.has_institute_role(auth.uid(), v_institute, 'institute_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE id = _role_id;
END;
$$;

REVOKE ALL ON FUNCTION public.institute_faculty_list(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.institute_add_faculty(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.institute_remove_faculty(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.institute_faculty_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.institute_add_faculty(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.institute_remove_faculty(uuid) TO authenticated;
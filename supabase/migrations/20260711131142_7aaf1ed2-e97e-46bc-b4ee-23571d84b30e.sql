
-- Slice 1: Test types (add custom + pyq) and Practice/Timed mode
ALTER TYPE public.test_type ADD VALUE IF NOT EXISTS 'custom';
ALTER TYPE public.test_type ADD VALUE IF NOT EXISTS 'pyq';

DO $$ BEGIN
  CREATE TYPE public.test_mode AS ENUM ('timed','practice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS mode public.test_mode NOT NULL DEFAULT 'timed',
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS mode public.test_mode NOT NULL DEFAULT 'timed';

-- Slice 2: PYQ tagging on questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS is_pyq boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pyq_year integer,
  ADD COLUMN IF NOT EXISTS pyq_exam text;

CREATE INDEX IF NOT EXISTS idx_questions_pyq ON public.questions(is_pyq, pyq_year, pyq_exam) WHERE is_pyq = true;
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON public.tests(created_by);

-- Allow users to create their own tests (custom/chapter/topic builders)
DROP POLICY IF EXISTS "Users can insert own tests" ON public.tests;
CREATE POLICY "Users can insert own tests" ON public.tests
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert own test_questions" ON public.test_questions;
CREATE POLICY "Users can insert own test_questions" ON public.test_questions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid()));

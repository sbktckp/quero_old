
-- =========================
-- MENTORS
-- =========================
CREATE TABLE IF NOT EXISTS public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
  current_year text NOT NULL CHECK (current_year IN ('1st','2nd','3rd','final','intern')),
  photo_url text,
  bio text,
  languages text[] NOT NULL DEFAULT '{}',
  gender text,
  rating numeric NOT NULL DEFAULT 0,
  total_reviews int4 NOT NULL DEFAULT 0,
  total_sessions int4 NOT NULL DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  availability jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mentors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.mentors TO authenticated;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified mentors" ON public.mentors
  FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified' AND is_active = true);
CREATE POLICY "Mentors can view own row" ON public.mentors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all mentors" ON public.mentors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply as mentor" ON public.mentors
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Mentors can update own row" ON public.mentors
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update mentors" ON public.mentors
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete mentors" ON public.mentors
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mentors_updated_at BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS mentors_college_idx ON public.mentors(college_id);
CREATE INDEX IF NOT EXISTS mentors_status_idx ON public.mentors(verification_status, is_active);

-- Prevent mentors from self-verifying: keep status/rating columns admin-only.
CREATE OR REPLACE FUNCTION public.mentors_guard_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.verification_status := OLD.verification_status;
  NEW.rating := OLD.rating;
  NEW.total_reviews := OLD.total_reviews;
  NEW.total_sessions := OLD.total_sessions;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mentors_guard_privileged_columns() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentors_guard_cols BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.mentors_guard_privileged_columns();

CREATE OR REPLACE FUNCTION public.mentors_force_pending_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.verification_status := 'pending';
    NEW.rating := 0; NEW.total_reviews := 0; NEW.total_sessions := 0;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mentors_force_pending_on_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentors_force_pending BEFORE INSERT ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.mentors_force_pending_on_insert();

-- Helper: is the current user this mentor row's owner?
CREATE OR REPLACE FUNCTION public.is_mentor_owner(_mentor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = _mentor_id AND m.user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_mentor_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mentor_owner(uuid) TO authenticated;

-- =========================
-- VERIFICATION DOCUMENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.mentor_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id_url text,
  college_id_card_url text,
  selfie_url text,
  fee_receipt_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.mentor_verification_documents TO authenticated;
GRANT ALL ON public.mentor_verification_documents TO service_role;
ALTER TABLE public.mentor_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentor can view own documents" ON public.mentor_verification_documents
  FOR SELECT TO authenticated USING (public.is_mentor_owner(mentor_id));
CREATE POLICY "Admins can view all documents" ON public.mentor_verification_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentor can submit own documents" ON public.mentor_verification_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_mentor_owner(mentor_id));
CREATE POLICY "Mentor can update own documents" ON public.mentor_verification_documents
  FOR UPDATE TO authenticated USING (public.is_mentor_owner(mentor_id)) WITH CHECK (public.is_mentor_owner(mentor_id));
CREATE POLICY "Admins can update documents" ON public.mentor_verification_documents
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- SESSION PRICING (admin editable)
-- =========================
CREATE TABLE IF NOT EXISTS public.mentor_session_pricing (
  session_type text PRIMARY KEY CHECK (session_type IN ('quick_chat','audio_call','video_call','premium_counselling')),
  label text NOT NULL,
  duration_minutes int4 NOT NULL,
  price_inr numeric NOT NULL,
  commission_percent numeric NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int4 NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mentor_session_pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mentor_session_pricing TO authenticated;
GRANT ALL ON public.mentor_session_pricing TO service_role;
ALTER TABLE public.mentor_session_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pricing" ON public.mentor_session_pricing
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage pricing" ON public.mentor_session_pricing
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER mentor_pricing_updated_at BEFORE UPDATE ON public.mentor_session_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mentor_session_pricing (session_type, label, duration_minutes, price_inr, sort_order) VALUES
  ('quick_chat', 'Quick Chat', 15, 99, 1),
  ('audio_call', 'Audio Call', 30, 299, 2),
  ('video_call', 'Video Call', 45, 499, 3),
  ('premium_counselling', 'Premium Counselling', 60, 799, 4)
ON CONFLICT (session_type) DO NOTHING;

-- =========================
-- SESSIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('quick_chat','audio_call','video_call','premium_counselling')),
  scheduled_at timestamptz NOT NULL,
  duration_minutes int4 NOT NULL,
  meeting_link text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  amount numeric NOT NULL,
  mentor_amount numeric,
  commission numeric,
  gateway_order_id text,
  gateway_payment_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mentor_sessions TO authenticated;
GRANT ALL ON public.mentor_sessions TO service_role;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can view own sessions" ON public.mentor_sessions
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Mentor can view own sessions" ON public.mentor_sessions
  FOR SELECT TO authenticated USING (public.is_mentor_owner(mentor_id));
CREATE POLICY "Admins can view all sessions" ON public.mentor_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Student can create own session" ON public.mentor_sessions
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Student can update own session" ON public.mentor_sessions
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Mentor can update own session" ON public.mentor_sessions
  FOR UPDATE TO authenticated USING (public.is_mentor_owner(mentor_id)) WITH CHECK (public.is_mentor_owner(mentor_id));
CREATE POLICY "Admins can update sessions" ON public.mentor_sessions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mentor_sessions_updated_at BEFORE UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS mentor_sessions_mentor_idx ON public.mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_student_idx ON public.mentor_sessions(student_id);

-- Non-admins may never set payment/earnings fields themselves.
CREATE OR REPLACE FUNCTION public.mentor_sessions_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := 'pending';
    NEW.status := 'pending';
    NEW.mentor_amount := NULL; NEW.commission := NULL;
    NEW.gateway_payment_id := NULL;
  ELSE
    NEW.payment_status := OLD.payment_status;
    NEW.amount := OLD.amount;
    NEW.mentor_amount := OLD.mentor_amount;
    NEW.commission := OLD.commission;
    NEW.gateway_order_id := OLD.gateway_order_id;
    NEW.gateway_payment_id := OLD.gateway_payment_id;
    NEW.student_id := OLD.student_id;
    NEW.mentor_id := OLD.mentor_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mentor_sessions_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentor_sessions_guard_trg BEFORE INSERT OR UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mentor_sessions_guard();

-- =========================
-- CHAT MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS public.mentor_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE SET NULL,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mentor_chat_messages TO authenticated;
GRANT ALL ON public.mentor_chat_messages TO service_role;
ALTER TABLE public.mentor_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages" ON public.mentor_chat_messages
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_mentor_owner(mentor_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants can send messages" ON public.mentor_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (student_id = auth.uid() OR public.is_mentor_owner(mentor_id)));

CREATE INDEX IF NOT EXISTS mentor_chat_pair_idx ON public.mentor_chat_messages(mentor_id, student_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_chat_messages;

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS public.mentor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE SET NULL,
  rating int4 NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  is_reported boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
GRANT SELECT ON public.mentor_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.mentor_reviews TO authenticated;
GRANT ALL ON public.mentor_reviews TO service_role;
ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible reviews" ON public.mentor_reviews
  FOR SELECT TO anon, authenticated USING (is_hidden = false);
CREATE POLICY "Admins can read all reviews" ON public.mentor_reviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Student can review completed session" ON public.mentor_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentor_sessions s
      WHERE s.id = mentor_reviews.session_id
        AND s.student_id = auth.uid()
        AND s.mentor_id = mentor_reviews.mentor_id
        AND s.status = 'completed'
    )
  );
CREATE POLICY "Anyone signed in can report a review" ON public.mentor_reviews
  FOR UPDATE TO authenticated USING (is_hidden = false) WITH CHECK (is_hidden = false);
CREATE POLICY "Admins can moderate reviews" ON public.mentor_reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON public.mentor_reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Only allow the is_reported flag to be flipped by non-admins.
CREATE OR REPLACE FUNCTION public.mentor_reviews_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.rating := OLD.rating;
  NEW.review := OLD.review;
  NEW.is_hidden := OLD.is_hidden;
  NEW.mentor_id := OLD.mentor_id;
  NEW.student_id := OLD.student_id;
  NEW.session_id := OLD.session_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mentor_reviews_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentor_reviews_guard_trg BEFORE UPDATE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.mentor_reviews_guard();

-- Keep mentor rating aggregates in sync.
CREATE OR REPLACE FUNCTION public.mentor_reviews_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mentor uuid := COALESCE(NEW.mentor_id, OLD.mentor_id);
BEGIN
  UPDATE public.mentors m SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 2) FROM public.mentor_reviews r WHERE r.mentor_id = v_mentor AND r.is_hidden = false), 0),
    total_reviews = (SELECT count(*) FROM public.mentor_reviews r WHERE r.mentor_id = v_mentor AND r.is_hidden = false)
  WHERE m.id = v_mentor;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mentor_reviews_recalc() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentor_reviews_recalc_trg AFTER INSERT OR UPDATE OR DELETE ON public.mentor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.mentor_reviews_recalc();

-- =========================
-- STORAGE POLICIES
-- =========================
-- mentor-verification-docs (private): owner folder = auth.uid()
CREATE POLICY "Mentor can upload own verification docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mentor-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Mentor can read own verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mentor-verification-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- mentor-photos (private bucket, signed URLs used like team-photos)
CREATE POLICY "Mentor can upload own photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mentor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can read mentor photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'mentor-photos');

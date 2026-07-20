
CREATE TABLE public.legal_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.legal_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_pages TO authenticated;
GRANT ALL ON public.legal_pages TO service_role;

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal pages are readable by everyone"
  ON public.legal_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert legal pages"
  ON public.legal_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal pages"
  ON public.legal_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal pages"
  ON public.legal_pages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_pages (slug, title, content) VALUES
('privacy-policy', 'Privacy Policy',
'Last updated: ' || to_char(now(), 'FMMonth DD, YYYY') || E'\n\n' ||
E'Quero ("we", "us", "our") operates the Quero exam-preparation app. This Privacy Policy explains what we collect, how we use it, and the choices you have.\n\n' ||
E'1. Information we collect\n' ||
E'- Account information you provide (name, email, exam goal, preferred language, weak subjects).\n' ||
E'- Usage data: tests attempted, answers submitted, scores, bookmarks, and study activity.\n' ||
E'- Device and log data: IP address, browser type, and access timestamps.\n\n' ||
E'2. How we use information\n' ||
E'- To personalize your dashboard, recommendations, and study plan.\n' ||
E'- To operate, maintain, and improve Quero.\n' ||
E'- To communicate service updates and respond to support requests.\n\n' ||
E'3. Sharing\n' ||
E'We do not sell your personal data. We share data only with service providers (hosting, authentication, payments) strictly to run Quero, and when required by law.\n\n' ||
E'4. Data retention\n' ||
E'We retain your data as long as your account is active. You can request deletion at any time from Profile → Delete my account.\n\n' ||
E'5. Your rights\n' ||
E'You may access, correct, export, or delete your data by contacting our support email or using in-app controls.\n\n' ||
E'6. Contact\n' ||
E'For privacy questions, email support@quero.app.'),
('terms', 'Terms of Service',
'Last updated: ' || to_char(now(), 'FMMonth DD, YYYY') || E'\n\n' ||
E'These Terms govern your use of Quero. By creating an account you agree to these Terms.\n\n' ||
E'1. Eligibility\n' ||
E'You must be at least 13 years old to use Quero. If you are under 18, you confirm that a parent or guardian has approved your use.\n\n' ||
E'2. Your account\n' ||
E'You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.\n\n' ||
E'3. Acceptable use\n' ||
E'Do not misuse the service: no scraping, no reselling content, no attempts to reverse engineer, and no sharing paid content with non-subscribers.\n\n' ||
E'4. Content\n' ||
E'All questions, explanations, and study material are provided for educational purposes only. Quero is not affiliated with NMC, NBEMS, NTA, MCC, or any state counseling authority. We make no guarantee of exam outcomes.\n\n' ||
E'5. Subscriptions and payments\n' ||
E'Paid plans are billed as displayed at checkout. See our Refund Policy for cancellation terms.\n\n' ||
E'6. Termination\n' ||
E'We may suspend or terminate accounts that violate these Terms. You may delete your account at any time.\n\n' ||
E'7. Disclaimer\n' ||
E'The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Quero is not liable for indirect or consequential damages.\n\n' ||
E'8. Contact\n' ||
E'Questions about these Terms: support@quero.app.'),
('refund-policy', 'Refund Policy',
'Last updated: ' || to_char(now(), 'FMMonth DD, YYYY') || E'\n\n' ||
E'We want you to be happy with Quero. This policy explains when refunds are available.\n\n' ||
E'1. 7-day refund window\n' ||
E'You can request a full refund within 7 days of your first paid subscription purchase if you have not consumed a substantial part of the plan (defined below).\n\n' ||
E'2. What counts as "substantial usage"\n' ||
E'A refund may be declined if, after purchase, you have attempted more than 3 full-length mock tests or downloaded significant paid content.\n\n' ||
E'3. Renewals\n' ||
E'Auto-renewal charges are non-refundable once billed. You can cancel auto-renewal any time from Profile → Subscription; access continues until the end of the paid period.\n\n' ||
E'4. How to request a refund\n' ||
E'Email support@quero.app from the address on your account with your order ID. Refunds are processed to the original payment method within 5–10 business days after approval.\n\n' ||
E'5. Exceptions\n' ||
E'Coupons, promotional credits, and free-trial conversions are non-refundable.\n\n' ||
E'6. Contact\n' ||
E'Refund questions: support@quero.app.'),
('contact', 'Contact Us',
E'We''d love to hear from you.\n\n' ||
E'Support email: support@quero.app\n\n' ||
E'For account, billing, refund, privacy, or content issues, please email us from the address on your Quero account so we can verify and respond faster.\n\n' ||
E'We typically reply within 1–2 business days.');

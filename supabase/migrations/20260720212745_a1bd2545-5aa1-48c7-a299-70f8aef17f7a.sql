
ALTER TABLE public.legal_pages ADD COLUMN IF NOT EXISTS sections jsonb;

UPDATE public.legal_pages SET
  title = 'Privacy Policy',
  sections = jsonb_build_object(
    'subtitle', 'Your privacy is our priority.',
    'intro', 'At Quero, we are committed to protecting your personal information and being transparent about how we use it.',
    'illustration', 'shield-lock',
    'items', jsonb_build_array(
      jsonb_build_object('icon','user','title','1. Information We Collect','body','We collect basic details like your name, email, mobile number, and profile information. If you use our counselling tools, we may also collect your NEET score, rank, category, and state details to provide personalized results.'),
      jsonb_build_object('icon','database','title','2. How We Use Your Information','body','Your information helps us provide MCQs, mock tests, college prediction, counselling guidance, and account services. We also use it to improve Quero and keep your account secure.'),
      jsonb_build_object('icon','shield-check','title','3. Information Sharing','body','We never sell your personal information. Data is shared only with trusted services such as payment providers, cloud hosting, or when required by law.'),
      jsonb_build_object('icon','lock','title','4. Data Security','body','Your data is protected using secure servers and encrypted connections. We continuously work to keep your information safe from unauthorized access.'),
      jsonb_build_object('icon','user','title','5. Your Rights','body','You can update your profile, request account deletion, or contact us to access or remove your personal information at any time.'),
      jsonb_build_object('icon','globe','title','6. Cookies & Tracking','body','We use cookies and analytics to improve app performance, remember your preferences, and provide a better experience. You can manage cookies through your browser settings.'),
      jsonb_build_object('icon','file-text','title','7. Changes to This Policy','body','We may update this Privacy Policy whenever needed. The latest version will always be available on this page with the updated date.')
    ),
    'trust', jsonb_build_object('heading','We Respect Your Trust','body','Your privacy matters to us. We are committed to keeping your information safe while helping you succeed in your NEET journey.'),
    'contact', jsonb_build_object('heading','Have Questions?','body','Need help with our Privacy Policy or your data? Contact us anytime. We''re happy to help.')
  ),
  updated_at = now()
WHERE slug = 'privacy-policy';

UPDATE public.legal_pages SET
  title = 'Refund Policy',
  sections = jsonb_build_object(
    'subtitle', 'Your satisfaction matters to us.',
    'intro', 'This policy explains the conditions under which refunds are provided for Quero''s services and subscriptions.',
    'illustration', 'clipboard-rupee',
    'items', jsonb_build_array(
      jsonb_build_object('icon','indian-rupee','title','1. General Policy','body','Refunds are applicable only under the conditions mentioned in this policy. All requests are reviewed on a case-by-case basis.'),
      jsonb_build_object('icon','shopping-cart','title','2. Eligibility for Refund','body','Refunds are available for eligible transactions made on Quero, subject to the time limits and conditions outlined below.'),
      jsonb_build_object('icon','clock','title','3. Refund Time Window','body','Refund requests must be raised within 7 days of purchase. Requests made after this period may not be considered.'),
      jsonb_build_object('icon','file-text','title','4. Non-Refundable Cases','body',E'No refunds will be provided for:\n• Partial usage of any paid service\n• Downloaded reports or accessed premium content\n• Change of mind or personal reasons'),
      jsonb_build_object('icon','credit-card','title','5. Payment & Processing Fees','body','Transaction charges or gateway fees are non-refundable in all cases.'),
      jsonb_build_object('icon','user-x','title','6. Subscription & Auto-Renewals','body','Auto-renewed subscriptions are non-refundable unless renewed in error. Please turn off auto-renewal if you do not wish to continue.'),
      jsonb_build_object('icon','shield-check','title','7. How to Request a Refund','body','You can raise a refund request by contacting our support team with your order details. Our team will get back to you within 3–5 working days.'),
      jsonb_build_object('icon','info','title','8. Policy Changes','body','We may update this Refund Policy from time to time. Changes will be posted on this page with the updated date.')
    ),
    'trust', jsonb_build_object('heading','Our Commitment','body','We aim to provide the best experience for NEET UG aspirants. If you face any issue, our support team is always here to help.'),
    'contact', jsonb_build_object('heading','Need Help?','body','If you have any questions about our Refund Policy or your transaction, feel free to contact us.')
  ),
  updated_at = now()
WHERE slug = 'refund-policy';

UPDATE public.legal_pages SET
  title = 'Terms & Conditions',
  sections = jsonb_build_object(
    'subtitle', 'Please read these terms carefully.',
    'intro', 'By using Quero, you agree to the following terms and conditions. These terms govern your access to and use of our platform and services.',
    'illustration', 'clipboard-check',
    'items', jsonb_build_array(
      jsonb_build_object('icon','user','title','1. Acceptance of Terms','body','By accessing or using Quero, you agree to be bound by these Terms & Conditions and our Privacy Policy.'),
      jsonb_build_object('icon','grid','title','2. About Quero','body','Quero is an educational platform that provides tools and resources for NEET UG counselling, college prediction, and related services.'),
      jsonb_build_object('icon','user-check','title','3. User Eligibility','body','You must be at least 13 years old to use Quero. By using our services, you represent that you meet this eligibility requirement.'),
      jsonb_build_object('icon','file-text','title','4. Use of Services','body','You agree to use Quero only for lawful purposes and in accordance with these terms. You must not misuse, copy, or attempt to gain unauthorized access to our services.'),
      jsonb_build_object('icon','credit-card','title','5. Payments & Refunds','body','All payments are processed securely. Refunds, if any, are subject to our Refund & Cancellation Policy.'),
      jsonb_build_object('icon','copyright','title','6. Intellectual Property','body','All content, features, and materials on Quero are our property and protected by applicable laws. You may not use our content without permission.'),
      jsonb_build_object('icon','shield','title','7. Limitation of Liability','body','Quero is not liable for any indirect, incidental, or consequential damages arising from the use of our platform.'),
      jsonb_build_object('icon','pencil','title','8. Changes to Terms','body','We may update these Terms & Conditions from time to time. We will notify you of any significant changes by posting them on this page.')
    ),
    'trust', jsonb_build_object('heading','Our Commitment to You','body','We are committed to providing a safe, reliable, and student-friendly experience on Quero.'),
    'contact', jsonb_build_object('heading','Have Questions?','body','If you have any questions about these Terms & Conditions or our services, feel free to contact us.')
  ),
  updated_at = now()
WHERE slug = 'terms';


CREATE POLICY "Public read team photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'team-photos');

CREATE POLICY "Admins manage team photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));

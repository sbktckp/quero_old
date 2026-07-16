
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS exam_type text NOT NULL DEFAULT 'NEET_UG',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.subjects SET exam_type = 'NEET_UG' WHERE slug IN ('physics','chemistry','botany','zoology');

-- Give Zoology a color/icon if missing (existing gap)
UPDATE public.subjects SET icon = COALESCE(icon,'bug'), color = COALESCE(color,'#F59E0B') WHERE slug = 'zoology';

INSERT INTO public.subjects (name, slug, icon, color, sort_order, exam_type, is_active) VALUES
  ('Anatomy','anatomy','bone','#EF4444',1,'NEET_PG',true),
  ('Physiology','physiology','heart-pulse','#F97316',2,'NEET_PG',true),
  ('Biochemistry','biochemistry','flask-conical','#F59E0B',3,'NEET_PG',true),
  ('Pharmacology','pharmacology','pill','#EAB308',4,'NEET_PG',true),
  ('Pathology','pathology','microscope','#84CC16',5,'NEET_PG',true),
  ('Microbiology','microbiology','bug','#10B981',6,'NEET_PG',true),
  ('Forensic Medicine','forensic-medicine','fingerprint','#14B8A6',7,'NEET_PG',true),
  ('Community Medicine (PSM)','community-medicine','users','#06B6D4',8,'NEET_PG',true),
  ('ENT','ent','ear','#0EA5E9',9,'NEET_PG',true),
  ('Ophthalmology','ophthalmology','eye','#3B82F6',10,'NEET_PG',true),
  ('General Medicine','general-medicine','stethoscope','#6366F1',11,'NEET_PG',true),
  ('General Surgery','general-surgery','scissors','#8B5CF6',12,'NEET_PG',true),
  ('Obstetrics & Gynaecology','obgyn','baby','#A855F7',13,'NEET_PG',true),
  ('Pediatrics','pediatrics','baby','#D946EF',14,'NEET_PG',true),
  ('Orthopedics','orthopedics','bone','#EC4899',15,'NEET_PG',true),
  ('Dermatology','dermatology','hand','#F43F5E',16,'NEET_PG',true),
  ('Psychiatry','psychiatry','brain','#64748B',17,'NEET_PG',true),
  ('Radiology','radiology','scan','#78716C',18,'NEET_PG',true),
  ('Anaesthesia','anaesthesia','syringe','#6B7280',19,'NEET_PG',true)
ON CONFLICT (slug) DO NOTHING;

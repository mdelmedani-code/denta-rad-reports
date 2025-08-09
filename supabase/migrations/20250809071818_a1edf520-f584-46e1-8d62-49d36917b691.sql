-- 1) Add column to store the Orthanc / DICOM StudyInstanceUID
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS study_instance_uid TEXT;

-- 2) Ensure uniqueness per case (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS cases_study_uid_unique
  ON public.cases (study_instance_uid)
  WHERE study_instance_uid IS NOT NULL;

-- 3) Index to speed up lookups by study UID
CREATE INDEX IF NOT EXISTS cases_study_uid_idx
  ON public.cases (study_instance_uid);

-- 4) View to debug linkage using existing columns
CREATE OR REPLACE VIEW public.case_studies AS
SELECT
  c.id AS case_id,
  c.clinic_id,
  c.patient_name,
  c.upload_date AS created_at,
  c.study_instance_uid
FROM public.cases c;
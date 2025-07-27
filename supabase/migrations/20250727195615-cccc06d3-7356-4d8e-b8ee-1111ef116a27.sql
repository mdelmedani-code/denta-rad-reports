-- Add Orthanc-specific fields to cases table
ALTER TABLE public.cases 
ADD COLUMN orthanc_study_id TEXT,
ADD COLUMN orthanc_series_id TEXT,
ADD COLUMN orthanc_instance_ids TEXT[];

-- Create index for faster Orthanc ID lookups
CREATE INDEX idx_cases_orthanc_study_id ON public.cases(orthanc_study_id);

-- Add comment explaining the new fields
COMMENT ON COLUMN public.cases.orthanc_study_id IS 'Orthanc Study ID for DICOM files';
COMMENT ON COLUMN public.cases.orthanc_series_id IS 'Orthanc Series ID for DICOM files';
COMMENT ON COLUMN public.cases.orthanc_instance_ids IS 'Array of Orthanc Instance IDs for DICOM files';
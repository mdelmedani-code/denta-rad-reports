-- Remove Orthanc-specific columns and add metadata storage
ALTER TABLE public.cases 
DROP COLUMN IF EXISTS orthanc_study_id,
DROP COLUMN IF EXISTS orthanc_series_id,
DROP COLUMN IF EXISTS orthanc_instance_ids,
DROP COLUMN IF EXISTS study_instance_uid;

-- Drop Orthanc index
DROP INDEX IF EXISTS idx_cases_orthanc_study_id;
DROP INDEX IF EXISTS cases_study_uid_unique;

-- Add new metadata columns for direct DICOM handling
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS dicom_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS series_count INTEGER,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_cases_dicom_metadata 
ON public.cases USING gin(dicom_metadata);

-- Add comment explaining the new approach
COMMENT ON COLUMN public.cases.dicom_metadata IS 'Extracted DICOM metadata stored as JSON';
COMMENT ON COLUMN public.cases.series_count IS 'Number of DICOM files in the series';
COMMENT ON COLUMN public.cases.processed_at IS 'Timestamp when DICOM files were processed';
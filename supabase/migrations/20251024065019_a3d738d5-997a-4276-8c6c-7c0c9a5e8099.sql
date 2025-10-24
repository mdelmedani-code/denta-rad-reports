-- Add patient_first_name and patient_last_name columns to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS patient_first_name TEXT,
ADD COLUMN IF NOT EXISTS patient_last_name TEXT;

-- Add completed_at column to reports table if it doesn't exist
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for faster folder name lookups on cases table
CREATE INDEX IF NOT EXISTS idx_cases_folder_name ON cases(folder_name);

-- Create index for patient lookups (for counter generation)
CREATE INDEX IF NOT EXISTS idx_cases_patient_names 
ON cases(patient_last_name, patient_first_name);

-- Create index for latest report queries
CREATE INDEX IF NOT EXISTS idx_reports_latest 
ON reports(case_id, is_latest) WHERE is_latest = TRUE;

-- Create index for reports by case_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);

-- Add comments
COMMENT ON COLUMN cases.patient_first_name IS 'Patient first name for folder naming (LASTNAME_FIRSTNAME_00001)';
COMMENT ON COLUMN cases.patient_last_name IS 'Patient last name for folder naming (LASTNAME_FIRSTNAME_00001)';
COMMENT ON COLUMN reports.completed_at IS 'Timestamp when report was marked as completed by reporter';
COMMENT ON INDEX idx_cases_folder_name IS 'Fast lookup of cases by folder name';
COMMENT ON INDEX idx_cases_patient_names IS 'Fast lookup for generating patient folder counters';
COMMENT ON INDEX idx_reports_latest IS 'Fast lookup of latest report version for each case';
-- Add Dropbox path tracking to cases table
ALTER TABLE cases 
  ADD COLUMN IF NOT EXISTS dropbox_scan_path TEXT,
  ADD COLUMN IF NOT EXISTS dropbox_report_path TEXT,
  ADD COLUMN IF NOT EXISTS synced_to_dropbox BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_dropbox_scan_path ON cases(dropbox_scan_path);
CREATE INDEX IF NOT EXISTS idx_cases_dropbox_report_path ON cases(dropbox_report_path);
CREATE INDEX IF NOT EXISTS idx_cases_synced_to_dropbox ON cases(synced_to_dropbox);

-- Add Dropbox path to reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS dropbox_path TEXT;

-- Drop template-related tables (if they exist)
DROP TABLE IF EXISTS pdf_templates CASCADE;
DROP TABLE IF EXISTS template_indications CASCADE;
DROP TABLE IF EXISTS cbct_report_templates CASCADE;
DROP TABLE IF EXISTS clinic_branding CASCADE;
DROP TABLE IF EXISTS pdf_generation_logs CASCADE;

-- Create audit log entry for the migration
COMMENT ON COLUMN cases.dropbox_scan_path IS 'Path to DICOM scan in Dropbox';
COMMENT ON COLUMN cases.dropbox_report_path IS 'Path to report PDF in Dropbox';
COMMENT ON COLUMN cases.synced_to_dropbox IS 'Whether case files are synced to Dropbox';
COMMENT ON COLUMN cases.synced_at IS 'When case was last synced to Dropbox';
COMMENT ON COLUMN cases.completed_at IS 'When reporter marked case as completed';
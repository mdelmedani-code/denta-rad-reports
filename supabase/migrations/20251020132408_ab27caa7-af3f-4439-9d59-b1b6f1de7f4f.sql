-- Add Dropbox path column to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS dropbox_path TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cases_dropbox_path ON cases(dropbox_path) WHERE dropbox_path IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN cases.dropbox_path IS 'Path to case files in Dropbox Business (format: /DentaRad/Uploads/{ORDER_ID}_{CASE_ID}/)';

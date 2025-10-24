-- Add unique constraint on folder_name to prevent duplicates
ALTER TABLE cases 
ADD CONSTRAINT unique_folder_name UNIQUE (folder_name);

-- Add upload tracking columns
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS upload_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sync_warnings TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_cases_upload_completed 
ON cases(upload_completed) 
WHERE upload_completed = false;

-- Add comments
COMMENT ON COLUMN cases.upload_completed IS 'True when entire upload+sync workflow completed successfully';
COMMENT ON COLUMN cases.sync_warnings IS 'Non-critical warnings during sync (e.g. metadata file failed)';
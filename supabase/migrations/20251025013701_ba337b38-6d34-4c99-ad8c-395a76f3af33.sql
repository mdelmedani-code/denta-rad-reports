-- Add archive fields to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Create index for archived cases queries
CREATE INDEX IF NOT EXISTS idx_cases_archived 
ON cases(archived, billed) 
WHERE archived = false;

-- Add comment
COMMENT ON COLUMN cases.archived IS 'Whether this case has been archived (removed from active views)';
COMMENT ON COLUMN cases.archived_at IS 'When the case was archived';
COMMENT ON COLUMN cases.archived_reason IS 'Reason for archiving (e.g., "Invoiced and paid")';

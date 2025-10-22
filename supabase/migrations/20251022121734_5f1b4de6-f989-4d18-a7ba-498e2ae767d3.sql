-- Add simple_id column for human-readable folder names
ALTER TABLE cases 
  ADD COLUMN IF NOT EXISTS simple_id INTEGER;

-- Create sequence for auto-incrementing IDs
CREATE SEQUENCE IF NOT EXISTS cases_simple_id_seq START 1;

-- Set default value to auto-increment
ALTER TABLE cases 
  ALTER COLUMN simple_id SET DEFAULT nextval('cases_simple_id_seq');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cases_simple_id ON cases(simple_id);

-- Backfill existing cases (if any)
UPDATE cases 
SET simple_id = nextval('cases_simple_id_seq')
WHERE simple_id IS NULL;

-- Add folder_name column to store computed folder name
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS folder_name TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_folder_name ON cases(folder_name);
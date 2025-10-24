-- Add columns to track scan upload verification
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS scan_uploaded_to_dropbox BOOLEAN DEFAULT false;

ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS scan_upload_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN cases.scan_uploaded_to_dropbox IS 
  'True if scan.zip has been verified to exist in Dropbox';

COMMENT ON COLUMN cases.scan_upload_verified_at IS 
  'Timestamp when scan.zip was verified in Dropbox';

-- Update existing synced cases to mark scan as uploaded
UPDATE cases 
SET scan_uploaded_to_dropbox = true,
    scan_upload_verified_at = synced_at
WHERE synced_to_dropbox = true 
  AND scan_uploaded_to_dropbox = false;
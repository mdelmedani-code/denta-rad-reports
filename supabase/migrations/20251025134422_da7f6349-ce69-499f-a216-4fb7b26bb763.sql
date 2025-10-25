
-- Add pdf_generated column to track if PDF has been created
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_generated BOOLEAN DEFAULT false;

-- Add pdf_storage_path to track where the PDF is stored
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

-- Update existing reports to set pdf_generated based on pdf_url
UPDATE reports SET pdf_generated = (pdf_url IS NOT NULL) WHERE pdf_url IS NOT NULL;

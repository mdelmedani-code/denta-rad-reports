-- Add template_data JSONB column to pdf_templates
ALTER TABLE pdf_templates 
ADD COLUMN IF NOT EXISTS template_data JSONB,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Set a default template_data for existing records
UPDATE pdf_templates 
SET template_data = '{
  "layout": "modern",
  "headerHeight": 80,
  "footerHeight": 50,
  "margins": {
    "top": 100,
    "bottom": 70,
    "left": 50,
    "right": 50
  },
  "sections": [
    {"id": "patient-info", "label": "Patient Information", "enabled": true, "order": 1},
    {"id": "clinical-question", "label": "Clinical Question", "enabled": true, "order": 2},
    {"id": "findings", "label": "Findings", "enabled": true, "order": 3},
    {"id": "images", "label": "Reference Images", "enabled": true, "order": 4},
    {"id": "impression", "label": "Impression", "enabled": true, "order": 5},
    {"id": "recommendations", "label": "Recommendations", "enabled": true, "order": 6}
  ],
  "typography": {
    "headingSize": 18,
    "subheadingSize": 14,
    "bodySize": 11,
    "captionSize": 9
  }
}'::jsonb
WHERE template_data IS NULL;

-- Make template_data NOT NULL after setting defaults
ALTER TABLE pdf_templates 
ALTER COLUMN template_data SET NOT NULL;
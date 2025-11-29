-- Add single report_content field to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_content TEXT;

-- Create simplified template settings table structure
-- We'll keep the existing table but simplify what we store
-- Update the default template to be a single general template
DO $$
BEGIN
  -- Check if the setting exists and update it, or insert if not
  IF EXISTS (SELECT 1 FROM template_settings WHERE setting_key = 'default_template') THEN
    UPDATE template_settings
    SET setting_value = jsonb_build_object(
      'content_placeholder', 'Enter your radiology report content here...'
    )
    WHERE setting_key = 'default_template';
  ELSE
    INSERT INTO template_settings (setting_key, setting_value)
    VALUES (
      'default_template',
      jsonb_build_object(
        'content_placeholder', 'Enter your radiology report content here...'
      )
    );
  END IF;
END $$;
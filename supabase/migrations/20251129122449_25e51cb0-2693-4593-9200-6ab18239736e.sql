-- Create template settings table for customizable default template
CREATE TABLE IF NOT EXISTS template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default template settings
INSERT INTO template_settings (setting_key, setting_value) VALUES
('default_template', jsonb_build_object(
  'technique_heading', 'TECHNIQUE:',
  'technique_placeholder', 'Enter technique details here...',
  'findings_heading', 'FINDINGS:',
  'findings_placeholder', 'Enter findings here...',
  'impression_heading', 'IMPRESSION:',
  'impression_placeholder', 'Enter impression here...'
))
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE template_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage template settings
CREATE POLICY "Admins can manage template settings"
  ON template_settings
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Reporters can view template settings
CREATE POLICY "Reporters can view template settings"
  ON template_settings
  FOR SELECT
  USING (get_current_user_role() IN ('admin', 'reporter'));
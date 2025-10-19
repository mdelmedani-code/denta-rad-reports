-- Create clinic_branding table (pdf_templates already exists)
CREATE TABLE clinic_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af' NOT NULL,
  secondary_color TEXT DEFAULT '#3b82f6' NOT NULL,
  accent_color TEXT DEFAULT '#60a5fa' NOT NULL,
  header_text TEXT,
  footer_text TEXT,
  template_id UUID REFERENCES pdf_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE clinic_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_branding
CREATE POLICY "Admins can manage all clinic branding"
ON clinic_branding
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Clinics can view own branding"
ON clinic_branding
FOR SELECT
TO authenticated
USING (clinic_id = get_current_user_clinic() OR get_current_user_role() = 'admin');

CREATE POLICY "Clinics can update own branding"
ON clinic_branding
FOR UPDATE
TO authenticated
USING (clinic_id = get_current_user_clinic());

CREATE POLICY "Clinics can insert own branding"
ON clinic_branding
FOR INSERT
TO authenticated
WITH CHECK (clinic_id = get_current_user_clinic());

-- Create trigger for updated_at
CREATE TRIGGER clinic_branding_updated_at_trigger
BEFORE UPDATE ON clinic_branding
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
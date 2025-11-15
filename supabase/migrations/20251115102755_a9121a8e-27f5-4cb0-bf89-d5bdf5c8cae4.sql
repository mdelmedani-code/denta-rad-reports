-- Create pdf_templates table
CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  indication_type TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  header_config JSONB DEFAULT '{
    "logo_url": null,
    "logo_position": "left",
    "logo_height": 60,
    "background_color": "#ffffff",
    "text_color": "#000000",
    "height": 80
  }'::jsonb,
  footer_config JSONB DEFAULT '{
    "text": "This report was prepared by a specialist radiologist",
    "background_color": "#f8f9fa",
    "text_color": "#6c757d",
    "height": 60,
    "show_page_numbers": true,
    "page_number_format": "Page {current} of {total}"
  }'::jsonb,
  color_scheme JSONB DEFAULT '{
    "primary": "#2563eb",
    "secondary": "#64748b",
    "background": "#ffffff",
    "text": "#0f172a",
    "heading": "#1e293b"
  }'::jsonb,
  typography_config JSONB DEFAULT '{
    "heading_font": "Helvetica",
    "body_font": "Helvetica",
    "h1_size": 24,
    "h2_size": 18,
    "h3_size": 14,
    "body_size": 11,
    "line_height": 1.5
  }'::jsonb,
  layout_config JSONB DEFAULT '{
    "page_size": "A4",
    "orientation": "portrait",
    "margin_top": 20,
    "margin_bottom": 20,
    "margin_left": 20,
    "margin_right": 20,
    "section_spacing": 15
  }'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  thumbnail_url TEXT
);

-- Create storage bucket for template logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('template-logos', 'template-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Track template usage
CREATE TABLE IF NOT EXISTS template_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES pdf_templates(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES profiles(id)
);

-- Add template_id to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES pdf_templates(id);

-- RLS Policies for pdf_templates
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to templates"
ON pdf_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Reporter read published templates"
ON pdf_templates FOR SELECT
USING (
  is_published = true AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'reporter')
  )
);

-- RLS for template_usage_log
ALTER TABLE template_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template usage"
ON template_usage_log FOR SELECT
USING (generated_by = auth.uid() OR get_current_user_role() = 'admin');

CREATE POLICY "Reporters can log template usage"
ON template_usage_log FOR INSERT
WITH CHECK (generated_by = auth.uid());

-- Storage policies for template logos
CREATE POLICY "Admin upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'template-logos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'template-logos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-logos');
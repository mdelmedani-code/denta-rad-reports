-- Create PDF template settings table
CREATE TABLE IF NOT EXISTS public.pdf_template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pdf_template_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage PDF template settings
CREATE POLICY "Admins can manage PDF template settings"
  ON public.pdf_template_settings
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Insert default settings
INSERT INTO public.pdf_template_settings (setting_key, setting_value) VALUES
('logo_dimensions', '{"width": 1100, "height": 175}'::jsonb),
('contact_info', '{"email": "Admin@dentarad.com", "address": "Your workplace address"}'::jsonb),
('header_colors', '{"border_color": "#5fa8a6", "label_color": "#5fa8a6"}'::jsonb),
('branding', '{"company_name": "DentaRad", "footer_text": "DentaRad - Professional CBCT Reporting"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE public.pdf_template_settings IS 'Stores customizable PDF template settings for report generation';
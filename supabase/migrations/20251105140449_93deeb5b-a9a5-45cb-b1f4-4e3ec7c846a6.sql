-- Add header logo settings (replacing the logo_dimensions setting)
INSERT INTO public.pdf_template_settings (setting_key, setting_value) VALUES
('header_logo', '{"show_logo": true, "width": 1100, "height": 175}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
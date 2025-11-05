-- Add footer logo settings
INSERT INTO public.pdf_template_settings (setting_key, setting_value) VALUES
('footer_logo', '{"show_logo": false, "width": 80, "height": 25}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
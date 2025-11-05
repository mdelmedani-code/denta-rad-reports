-- Add logo URLs to settings
INSERT INTO public.pdf_template_settings (setting_key, setting_value) VALUES
('logo_urls', '{"header_logo_url": null, "footer_logo_url": null}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a storage bucket for template assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-assets', 'template-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for template assets
CREATE POLICY "Admins can upload template assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-assets' 
    AND get_current_user_role() = 'admin'
  );

CREATE POLICY "Admins can update template assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-assets' 
    AND get_current_user_role() = 'admin'
  );

CREATE POLICY "Admins can delete template assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'template-assets' 
    AND get_current_user_role() = 'admin'
  );

CREATE POLICY "Template assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-assets');
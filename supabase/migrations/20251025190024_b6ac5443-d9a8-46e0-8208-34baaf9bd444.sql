-- Add UPDATE policy for reporters on reports table
CREATE POLICY "Reporters can update reports"
ON reports
FOR UPDATE
TO authenticated
USING (get_current_user_role() = ANY(ARRAY['admin', 'reporter']))
WITH CHECK (get_current_user_role() = ANY(ARRAY['admin', 'reporter']));

-- Add storage policies for reports bucket
-- Allow authenticated users to upload to reports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow reporters and admins to upload PDFs
CREATE POLICY "Reporters can upload report PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' 
  AND get_current_user_role() = ANY(ARRAY['admin', 'reporter'])
);

-- Allow reporters and admins to update PDFs (for regeneration)
CREATE POLICY "Reporters can update report PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' 
  AND get_current_user_role() = ANY(ARRAY['admin', 'reporter'])
);

-- Allow everyone to read reports (since bucket is public)
CREATE POLICY "Anyone can view report PDFs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reports');
-- Create RLS policies for the cbct-scans storage bucket

-- Allow authenticated users to insert files into cbct-scans bucket
CREATE POLICY "Allow authenticated users to upload DICOM files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'cbct-scans');

-- Allow authenticated users to view their own uploaded files
CREATE POLICY "Allow authenticated users to view their own DICOM files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'cbct-scans');

-- Allow authenticated users to delete their own uploaded files
CREATE POLICY "Allow authenticated users to delete their own DICOM files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'cbct-scans');

-- Allow service role to access all files in cbct-scans bucket (for edge functions)
CREATE POLICY "Allow service role full access to cbct-scans" 
ON storage.objects 
FOR ALL 
TO service_role 
USING (bucket_id = 'cbct-scans');
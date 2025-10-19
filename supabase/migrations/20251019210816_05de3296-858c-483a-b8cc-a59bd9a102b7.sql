-- Fix storage RLS policies for cbct-scans bucket

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to view their own DICOM files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own DICOM files" ON storage.objects;

-- Update clinic viewing policy to check via cases table (more secure)
DROP POLICY IF EXISTS "Clinics can view their own scans" ON storage.objects;
CREATE POLICY "Clinics can view their own scans via cases"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cbct-scans' 
  AND (
    -- Admin can view all
    get_current_user_role() = 'admin'
    OR
    -- Clinic can view their own cases
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.file_path = name
        AND c.clinic_id = get_current_user_clinic()
    )
  )
);

-- Add policy for clinics to delete their own scans
-- (Will show warning in UI if status != 'uploaded')
CREATE POLICY "Clinics can delete their own scans"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cbct-scans'
  AND (
    -- Admin can delete all
    get_current_user_role() = 'admin'
    OR
    -- Clinic can delete their own cases
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.file_path = name
        AND c.clinic_id = get_current_user_clinic()
    )
  )
);

-- Admins can still view all scans (existing policy remains)
-- Clinics can still upload scans (existing policy remains)
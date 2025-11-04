-- Allow clinics to view report images for their cases
CREATE POLICY "Clinics can view images for their reports"
ON report_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM reports r
    JOIN cases c ON r.case_id = c.id
    WHERE r.id = report_images.report_id
    AND c.clinic_id = get_current_user_clinic()
  )
);
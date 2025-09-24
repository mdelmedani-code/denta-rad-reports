-- Add sign-off fields to reports table
ALTER TABLE public.reports 
ADD COLUMN signed_off_by uuid REFERENCES auth.users(id),
ADD COLUMN signed_off_at timestamp with time zone,
ADD COLUMN signatory_name text,
ADD COLUMN signatory_title text,
ADD COLUMN signatory_credentials text,
ADD COLUMN signature_statement text;

-- Update profiles table to include professional details for radiologists
ALTER TABLE public.profiles
ADD COLUMN professional_title text,
ADD COLUMN credentials text,
ADD COLUMN signature_statement text;

-- Create a function to sign off a report
CREATE OR REPLACE FUNCTION public.sign_off_report(
  p_report_id uuid,
  p_signatory_name text,
  p_signatory_title text,
  p_signatory_credentials text,
  p_signature_statement text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can sign off reports
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admin users can sign off reports';
  END IF;
  
  -- Update the report with sign-off information
  UPDATE public.reports
  SET 
    signed_off_by = auth.uid(),
    signed_off_at = now(),
    signatory_name = p_signatory_name,
    signatory_title = p_signatory_title,
    signatory_credentials = p_signatory_credentials,
    signature_statement = COALESCE(p_signature_statement, 'I have reviewed this diagnostic report and confirm the findings are accurate based on the imaging analysis.')
  WHERE id = p_report_id;
  
  RETURN FOUND;
END;
$$;

-- Insert default professional details for admin users
INSERT INTO public.profiles (id, email, role, professional_title, credentials, signature_statement)
SELECT 
  u.id,
  u.email,
  'admin'::user_role,
  'Consultant Radiologist',
  'GMC 7514964',
  'I have reviewed this diagnostic report and confirm the findings are accurate based on the CBCT imaging analysis performed using AI-assisted diagnostic tools.'
FROM auth.users u
WHERE u.email LIKE '%admin%' OR u.email LIKE '%mohamed%' OR u.email LIKE '%elmedani%'
ON CONFLICT (id) DO UPDATE SET
  professional_title = EXCLUDED.professional_title,
  credentials = EXCLUDED.credentials,
  signature_statement = EXCLUDED.signature_statement;
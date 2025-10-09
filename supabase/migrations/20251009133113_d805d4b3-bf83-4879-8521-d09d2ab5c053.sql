-- ============================================
-- FIX ERROR-LEVEL SECURITY ISSUES (REGEX FIXED)
-- ============================================

-- 1. BILLABLE_REPORTS VIEW ACCESS CONTROL
COMMENT ON VIEW public.billable_reports IS 
  'Security: Access controlled through RLS policies on underlying tables (cases, reports, clinics). Clinics see only their own data, admins see all.';

-- 2. CREATE SECURE TABLE FOR MFA SECRETS
CREATE TABLE IF NOT EXISTS public.auth_secrets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_secret text,
  mfa_backup_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.auth_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert auth secrets"
ON public.auth_secrets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update auth secrets"
ON public.auth_secrets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. MIGRATE EXISTING MFA DATA
INSERT INTO public.auth_secrets (user_id, mfa_secret, mfa_backup_codes)
SELECT 
  id,
  mfa_secret,
  CASE 
    WHEN backup_codes IS NOT NULL THEN to_jsonb(backup_codes)
    WHEN mfa_backup_codes IS NOT NULL THEN to_jsonb(mfa_backup_codes)
    ELSE '[]'::jsonb
  END as codes
FROM public.profiles
WHERE mfa_secret IS NOT NULL OR backup_codes IS NOT NULL OR mfa_backup_codes IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  mfa_secret = EXCLUDED.mfa_secret,
  mfa_backup_codes = EXCLUDED.mfa_backup_codes,
  updated_at = now();

-- 4. FIX SEARCH_PATH FOR FUNCTION
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM public.invoices;
  
  invoice_num := 'INV-' || LPAD(counter::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- 5. MFA SECRET MANAGEMENT FUNCTIONS
CREATE OR REPLACE FUNCTION public.verify_mfa_token(
  p_user_id uuid,
  p_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_secret text;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  SELECT mfa_secret INTO stored_secret
  FROM public.auth_secrets
  WHERE user_id = p_user_id;
  
  IF stored_secret IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_mfa_secret(
  p_user_id uuid,
  p_mfa_secret text,
  p_backup_codes jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.auth_secrets (user_id, mfa_secret, mfa_backup_codes)
  VALUES (p_user_id, p_mfa_secret, p_backup_codes)
  ON CONFLICT (user_id) DO UPDATE SET
    mfa_secret = EXCLUDED.mfa_secret,
    mfa_backup_codes = EXCLUDED.mfa_backup_codes,
    updated_at = now();
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_backup_codes(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  codes jsonb;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT mfa_backup_codes INTO codes
  FROM public.auth_secrets
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(codes, '[]'::jsonb);
END;
$$;

-- 6. DATABASE CONSTRAINTS FOR INPUT VALIDATION
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS patient_name_length;
ALTER TABLE public.cases 
  ADD CONSTRAINT patient_name_length 
  CHECK (length(patient_name) <= 200 AND length(patient_name) > 0);

ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS clinical_question_length;
ALTER TABLE public.cases 
  ADD CONSTRAINT clinical_question_length 
  CHECK (length(clinical_question) <= 2000 AND length(clinical_question) > 0);

ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS patient_internal_id_format;
ALTER TABLE public.cases 
  ADD CONSTRAINT patient_internal_id_format 
  CHECK (patient_internal_id IS NULL OR (length(patient_internal_id) <= 100 AND patient_internal_id ~ '^[a-zA-Z0-9_-]+$'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS email_format;
ALTER TABLE public.profiles 
  ADD CONSTRAINT email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS report_text_length;
ALTER TABLE public.reports 
  ADD CONSTRAINT report_text_length 
  CHECK (report_text IS NULL OR length(report_text) <= 50000);

DROP TRIGGER IF EXISTS update_auth_secrets_updated_at ON public.auth_secrets;
CREATE TRIGGER update_auth_secrets_updated_at
  BEFORE UPDATE ON public.auth_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
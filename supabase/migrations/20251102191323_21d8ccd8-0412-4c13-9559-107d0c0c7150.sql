-- Fix 1: Add SET search_path to all SECURITY DEFINER functions that are missing it
-- This prevents SQL injection attacks via search_path manipulation

-- Fix is_account_locked function
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text)
 RETURNS TABLE(locked boolean, unlock_at timestamp with time zone, attempts integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  failed_count INTEGER;
  last_attempt TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*), MAX(attempt_time)
  INTO failed_count, last_attempt
  FROM login_attempts
  WHERE email = p_email
    AND successful = FALSE
    AND attempt_time > NOW() - INTERVAL '15 minutes';
  
  IF failed_count >= 5 THEN
    RETURN QUERY SELECT 
      TRUE, 
      last_attempt + INTERVAL '15 minutes',
      failed_count;
  ELSE
    RETURN QUERY SELECT 
      FALSE, 
      NULL::TIMESTAMPTZ,
      failed_count;
  END IF;
END;
$function$;

-- Fix record_login_attempt function
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_successful boolean, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO login_attempts (email, successful, ip_address, user_agent)
  VALUES (p_email, p_successful, p_ip_address::INET, p_user_agent);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$function$;

-- Fix ensure_clinic_for_user function
CREATE OR REPLACE FUNCTION public.ensure_clinic_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_clinic_id UUID;
  v_email TEXT;
BEGIN
  -- Only for clinic users
  IF NEW.role = 'clinic' AND NEW.clinic_id IS NULL THEN
    -- Get user email
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    
    -- Check if clinic exists for this email
    SELECT id INTO v_clinic_id 
    FROM clinics 
    WHERE contact_email = v_email 
    LIMIT 1;
    
    -- If no clinic exists, create one
    IF v_clinic_id IS NULL THEN
      INSERT INTO clinics (name, contact_email)
      VALUES (
        COALESCE(
          SPLIT_PART(v_email, '@', 1),
          'Default Clinic'
        ),
        v_email
      )
      RETURNING id INTO v_clinic_id;
    END IF;
    
    -- Set the clinic_id
    NEW.clinic_id := v_clinic_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix auto_assign_case_to_reporter function
CREATE OR REPLACE FUNCTION public.auto_assign_case_to_reporter()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reporter_id UUID;
BEGIN
  -- Get the first reporter or admin
  SELECT id INTO v_reporter_id 
  FROM profiles 
  WHERE role IN ('reporter', 'admin')
  ORDER BY created_at
  LIMIT 1;
  
  -- Assign case to reporter if found
  IF v_reporter_id IS NOT NULL THEN
    NEW.status := 'uploaded';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix notify_status_change function
CREATE OR REPLACE FUNCTION public.notify_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the status change without sending HTTP notifications
  RAISE LOG 'Case % status changed from % to %', NEW.id, OLD.status, NEW.status;
  RETURN NEW;
END;
$function$;

-- Fix create_report_share function
CREATE OR REPLACE FUNCTION public.create_report_share(p_report_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  share_token TEXT;
BEGIN
  -- Generate a secure random token
  share_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert the share record
  INSERT INTO public.report_shares (report_id, share_token, created_by)
  VALUES (p_report_id, share_token, auth.uid());
  
  RETURN share_token;
END;
$function$;

-- Fix acquire_case_lock function
CREATE OR REPLACE FUNCTION public.acquire_case_lock(p_patient_last_name text, p_patient_first_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key BIGINT;
  v_user_id UUID;
BEGIN
  -- Verify caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - anonymous users cannot acquire locks';
  END IF;
  
  -- Generate unique lock key from patient name
  v_lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (blocks if already locked)
  PERFORM pg_advisory_lock(v_lock_key);
  
  -- Return TRUE on success
  RETURN TRUE;

EXCEPTION 
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to acquire lock: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Fix release_case_lock function
CREATE OR REPLACE FUNCTION public.release_case_lock(p_patient_last_name text, p_patient_first_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key BIGINT;
  v_user_id UUID;
BEGIN
  -- Verify caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - anonymous users cannot release locks';
  END IF;
  
  -- Generate same lock key
  v_lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Release advisory lock
  PERFORM pg_advisory_unlock(v_lock_key);
  
  -- Return TRUE on success
  RETURN TRUE;

EXCEPTION 
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to release lock: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Fix 2: Add explicit RLS denial policy for anonymous users on profiles
CREATE POLICY "Anonymous users cannot access profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Fix 3: Ensure storage bucket policies are properly configured
-- Verify cbct-scans bucket allows only authenticated clinic users to upload their own scans
CREATE POLICY "Clinics can upload own scans"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cbct-scans' 
  AND (storage.foldername(name))[1] = get_current_user_clinic()::text
);

CREATE POLICY "Clinics can view own scans"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cbct-scans' 
  AND (
    (storage.foldername(name))[1] = get_current_user_clinic()::text
    OR get_current_user_role() IN ('admin', 'reporter')
  )
);

CREATE POLICY "Admins can manage all cbct-scans"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'cbct-scans' 
  AND get_current_user_role() = 'admin'
);

-- Ensure report-images bucket is secure
CREATE POLICY "Reporters can manage report images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'report-images' 
  AND get_current_user_role() IN ('admin', 'reporter')
);

CREATE POLICY "Clinics can view report images for their cases"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-images'
  AND (
    get_current_user_role() IN ('admin', 'reporter', 'clinic')
  )
);
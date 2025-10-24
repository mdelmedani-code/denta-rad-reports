-- Fix rate limiting function (per-clinic, 1-hour window)
DROP FUNCTION IF EXISTS public.check_upload_rate_limit(uuid);

CREATE OR REPLACE FUNCTION public.check_upload_rate_limit(p_clinic_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  upload_count INTEGER;
BEGIN
  -- Count uploads in the last 1 HOUR for this CLINIC
  SELECT COUNT(*) INTO upload_count
  FROM public.cases
  WHERE clinic_id = p_clinic_id
    AND created_at > (NOW() - INTERVAL '1 hour');
  
  -- Return TRUE if under limit, NULL-safe
  RETURN COALESCE(upload_count, 0) < 20;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE WARNING 'Rate limit check failed: %', SQLERRM;
    RETURN TRUE;  -- Fail open to not block uploads if DB error
END;
$function$;

-- Fix lock functions to return proper boolean values
DROP FUNCTION IF EXISTS public.acquire_case_lock(text, text);

CREATE OR REPLACE FUNCTION public.acquire_case_lock(p_patient_last_name text, p_patient_first_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  v_lock_key BIGINT;
  v_user_id UUID;
BEGIN
  -- Verify user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Generate unique lock key from patient name
  v_lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (blocks if already locked)
  PERFORM pg_advisory_lock(v_lock_key);
  
  -- Return TRUE on success
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$function$;

DROP FUNCTION IF EXISTS public.release_case_lock(text, text);

CREATE OR REPLACE FUNCTION public.release_case_lock(p_patient_last_name text, p_patient_first_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  v_lock_key BIGINT;
  v_user_id UUID;
BEGIN
  -- Verify user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Release advisory lock
  PERFORM pg_advisory_unlock(v_lock_key);
  
  -- Return TRUE on success
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$function$;

-- Drop upload_rate_limits table (no longer needed)
DROP TABLE IF EXISTS public.upload_rate_limits;
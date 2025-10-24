-- ========================================
-- CRITICAL FIX #1: Rate Limiting (Per-Clinic, 1-Hour Window)
-- ========================================

-- Drop broken function
DROP FUNCTION IF EXISTS check_upload_rate_limit(uuid);

-- Drop unnecessary table
DROP TABLE IF EXISTS upload_rate_limits;

-- Create correct function: checks CLINIC uploads in last HOUR
CREATE OR REPLACE FUNCTION check_upload_rate_limit(
  p_clinic_id UUID
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION check_upload_rate_limit IS 
  'Enforces 20 uploads per hour per clinic (not per user). Fails open on errors.';

-- ========================================
-- CRITICAL FIX #2: Lock Functions Return Values
-- ========================================

-- Drop existing broken functions
DROP FUNCTION IF EXISTS acquire_case_lock(text, text);
DROP FUNCTION IF EXISTS release_case_lock(text, text);

-- Recreate with PROPER RETURN VALUES
CREATE OR REPLACE FUNCTION acquire_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION release_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION acquire_case_lock IS 
  'Acquires advisory lock for patient (prevents race conditions). Returns TRUE on success, FALSE on failure.';

COMMENT ON FUNCTION release_case_lock IS 
  'Releases advisory lock for patient. Always call in finally block. Returns TRUE on success, FALSE on failure.';
-- ============================================================================
-- ENHANCEMENT 1: Rate Limiting
-- ============================================================================

-- Table already exists, just adding index for performance
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_timestamp 
ON upload_rate_limits(user_id, upload_timestamp DESC);

-- ============================================================================
-- ENHANCEMENT 2: Lock Function Security Hardening
-- ============================================================================

-- Update acquire_case_lock to use SECURITY INVOKER (more secure)
CREATE OR REPLACE FUNCTION acquire_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Generate unique lock key from patient name
  lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (blocks if already locked)
  PERFORM pg_advisory_lock(lock_key);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- Changed from SECURITY DEFINER

-- Update release_case_lock to use SECURITY INVOKER
CREATE OR REPLACE FUNCTION release_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Release advisory lock
  PERFORM pg_advisory_unlock(lock_key);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- Changed from SECURITY DEFINER

-- ============================================================================
-- ENHANCEMENT 5: System Health Monitoring
-- ============================================================================

-- Function to detect system health issues
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE(
  issue_type TEXT,
  severity TEXT,
  count BIGINT,
  details TEXT
) AS $$
BEGIN
  -- Check for orphaned uploads (created but never completed)
  RETURN QUERY
  SELECT 
    'orphaned_uploads'::TEXT as issue_type,
    'medium'::TEXT as severity,
    COUNT(*) as count,
    'Cases created over 24 hours ago but upload_completed is still false'::TEXT as details
  FROM cases
  WHERE upload_completed = false
    AND created_at < NOW() - INTERVAL '24 hours'
  HAVING COUNT(*) > 0;
  
  -- Check for failed syncs
  RETURN QUERY
  SELECT 
    'failed_syncs'::TEXT as issue_type,
    'medium'::TEXT as severity,
    COUNT(*) as count,
    'Cases with sync_warnings that need attention'::TEXT as details
  FROM cases
  WHERE sync_warnings IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
  HAVING COUNT(*) > 0;
  
  -- Check for stale cases (uploaded but not synced)
  RETURN QUERY
  SELECT 
    'stale_cases'::TEXT as issue_type,
    'low'::TEXT as severity,
    COUNT(*) as count,
    'Cases uploaded but not synced to Dropbox for over 1 hour'::TEXT as details
  FROM cases
  WHERE synced_to_dropbox = false
    AND created_at < NOW() - INTERVAL '1 hour'
    AND status = 'uploaded'
  HAVING COUNT(*) > 0;
  
  -- Check for old unprocessed uploads
  RETURN QUERY
  SELECT 
    'unprocessed_uploads'::TEXT as issue_type,
    'high'::TEXT as severity,
    COUNT(*) as count,
    'Cases uploaded over 48 hours ago still not processed'::TEXT as details
  FROM cases
  WHERE status = 'uploaded'
    AND created_at < NOW() - INTERVAL '48 hours'
  HAVING COUNT(*) > 0;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION check_system_health IS 'Detects system health issues like orphaned uploads, failed syncs, and stale cases';
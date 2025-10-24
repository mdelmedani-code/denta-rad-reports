-- =============================================================================
-- ADVISORY LOCK FUNCTIONS (Fix race condition)
-- =============================================================================

-- Function to acquire lock for a specific patient
CREATE OR REPLACE FUNCTION acquire_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  -- Generate unique lock key from patient name
  -- Using MD5 hash converted to bigint for stable lock key
  lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (blocks if already locked)
  PERFORM pg_advisory_lock(lock_key);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release lock for a specific patient
CREATE OR REPLACE FUNCTION release_case_lock(
  p_patient_last_name TEXT,
  p_patient_first_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  lock_key := ('x' || substr(md5(p_patient_last_name || '_' || p_patient_first_name), 1, 16))::bit(64)::bigint;
  
  -- Release advisory lock
  PERFORM pg_advisory_unlock(lock_key);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATA RETENTION & GDPR (Optional but recommended)
-- =============================================================================

-- Add columns for data deletion tracking
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Index for finding deleted cases
CREATE INDEX IF NOT EXISTS idx_cases_deleted_at 
ON cases(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Function to auto-pseudonymize old cases (8-year retention)
CREATE OR REPLACE FUNCTION auto_pseudonymize_old_cases()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE cases
  SET 
    patient_name = '[ARCHIVED]',
    patient_internal_id = '[ARCHIVED]',
    clinical_question = '[ARCHIVED]',
    deleted_at = NOW(),
    deletion_reason = 'Auto-archived after 8-year retention period'
  WHERE 
    status = 'report_ready'
    AND created_at < NOW() - INTERVAL '8 years'
    AND deleted_at IS NULL;
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE 'Auto-pseudonymized % old cases', affected_rows;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION acquire_case_lock IS 'Acquires advisory lock for patient to prevent race conditions during case creation';
COMMENT ON FUNCTION release_case_lock IS 'Releases advisory lock after case creation completes';
COMMENT ON FUNCTION auto_pseudonymize_old_cases IS 'Pseudonymizes patient data after 8-year retention period (run monthly)';
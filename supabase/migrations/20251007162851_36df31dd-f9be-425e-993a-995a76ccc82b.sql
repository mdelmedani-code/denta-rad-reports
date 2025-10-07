-- =====================================================
-- Secure Audit Logs - Prevent Tampering
-- =====================================================

-- Create secure logging function that cannot be bypassed
CREATE OR REPLACE FUNCTION log_audit_event_secure(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get authenticated user (cannot be spoofed - comes from auth.uid())
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated - cannot log audit event';
  END IF;
  
  -- Get email from auth system
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Insert audit log with verified user info
  INSERT INTO security_audit_log (
    user_id,
    action,
    table_name,
    details,
    created_at
  ) VALUES (
    v_user_id,
    p_action,
    p_resource_type,
    jsonb_build_object(
      'resource_id', p_resource_id,
      'email', v_user_email,
      'details', p_details
    ),
    NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log failure but don't block user action
    RAISE WARNING 'Audit log failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION log_audit_event_secure TO authenticated;

-- Make audit logs IMMUTABLE - cannot be updated
DROP POLICY IF EXISTS "Audit logs are immutable" ON security_audit_log;
CREATE POLICY "Audit logs are immutable"
  ON security_audit_log FOR UPDATE
  TO authenticated, service_role
  USING (false);

-- Cannot delete audit logs
DROP POLICY IF EXISTS "Audit logs cannot be deleted by users" ON security_audit_log;
CREATE POLICY "Audit logs cannot be deleted by users"
  ON security_audit_log FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON FUNCTION log_audit_event_secure IS 'Secure audit logging - user identity verified via auth.uid()';
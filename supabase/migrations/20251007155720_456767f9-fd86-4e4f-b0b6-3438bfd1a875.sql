-- Enable RLS on login_attempts table
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view all login attempts"
ON login_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert login attempts (via functions)
CREATE POLICY "System can insert login attempts"
ON login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

COMMENT ON POLICY "Admins can view all login attempts" ON login_attempts IS 'Only admin users can view login attempt history';
COMMENT ON POLICY "System can insert login attempts" ON login_attempts IS 'Allow system to record login attempts via security definer functions';
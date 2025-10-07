-- Migration: Add secure backup codes and rate limiting

-- 1. Add backup codes column to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backup_codes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.backup_codes IS 'Hashed MFA backup codes (bcrypt) - never store plaintext';

-- Index for backup code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_backup_codes ON profiles USING GIN (backup_codes);

-- 2. Track login attempts for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMPTZ DEFAULT NOW(),
  successful BOOLEAN DEFAULT FALSE,
  user_agent TEXT
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_time DESC);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email TEXT)
RETURNS TABLE(locked BOOLEAN, unlock_at TIMESTAMPTZ, attempts INTEGER) AS $$
DECLARE
  failed_count INTEGER;
  last_attempt TIMESTAMPTZ;
BEGIN
  -- Count failed attempts in last 15 minutes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email TEXT,
  p_successful BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (email, successful, ip_address, user_agent)
  VALUES (p_email, p_successful, p_ip_address::INET, p_user_agent);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_account_locked TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_login_attempt TO authenticated, anon;

COMMENT ON TABLE login_attempts IS 'Tracks login attempts for rate limiting and brute force prevention';
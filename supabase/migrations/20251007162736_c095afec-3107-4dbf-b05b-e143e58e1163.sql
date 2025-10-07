-- Add CSRF token columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS csrf_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS csrf_token_expires_at TIMESTAMPTZ;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_csrf ON profiles(csrf_token);

COMMENT ON COLUMN profiles.csrf_token IS 'CSRF token for form submission validation';
COMMENT ON COLUMN profiles.csrf_token_expires_at IS 'CSRF token expiration timestamp';
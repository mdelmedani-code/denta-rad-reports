-- Add terms tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Index for compliance checks
CREATE INDEX IF NOT EXISTS idx_profiles_terms ON profiles(terms_accepted_at);

COMMENT ON COLUMN profiles.terms_accepted_at IS 'When user accepted Terms of Service';
COMMENT ON COLUMN profiles.terms_version IS 'Version of terms accepted (for future updates)';
-- Remove MFA-related columns and functions

-- Drop MFA-related functions
DROP FUNCTION IF EXISTS public.verify_mfa_token(uuid, text);
DROP FUNCTION IF EXISTS public.store_mfa_secret(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.get_backup_codes(uuid);

-- Drop auth_secrets table if it exists
DROP TABLE IF EXISTS public.auth_secrets;

-- Remove MFA columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS mfa_enabled,
DROP COLUMN IF EXISTS mfa_enforced_at,
DROP COLUMN IF EXISTS backup_codes;
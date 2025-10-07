-- Part 1: Create proper roles system (CRITICAL SECURITY FIX)
-- Current profiles table has role column, we need to move to separate table

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'clinic', 'reporter');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role FROM public.profiles WHERE role IS NOT NULL;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update get_current_user_role to use new table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Part 1: Add MFA columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enforced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_mfa ON public.profiles(mfa_enabled, mfa_enforced_at);

COMMENT ON COLUMN public.profiles.mfa_enabled IS 'Whether MFA is enabled for this user';
COMMENT ON COLUMN public.profiles.mfa_secret IS 'TOTP secret (encrypted)';
COMMENT ON COLUMN public.profiles.mfa_backup_codes IS 'Backup codes for MFA recovery';
COMMENT ON COLUMN public.profiles.mfa_enforced_at IS 'When MFA was successfully set up';

-- Part 2: Create upload rate limiting table
CREATE TABLE public.upload_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    file_size BIGINT,
    file_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_time 
ON public.upload_rate_limits(user_id, upload_timestamp DESC);

ALTER TABLE public.upload_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload history"
ON public.upload_rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert upload records"
ON public.upload_rate_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all uploads"
ON public.upload_rate_limits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check upload rate limit (20 uploads per 24 hours)
CREATE OR REPLACE FUNCTION public.check_upload_rate_limit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upload_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO upload_count
  FROM public.upload_rate_limits
  WHERE user_id = _user_id
    AND upload_timestamp > (now() - INTERVAL '24 hours');
  
  RETURN upload_count < 20;
END;
$$;

-- Part 3: Enhance audit logging with more context
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS event_category TEXT;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';

CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.security_audit_log(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.security_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON public.security_audit_log(user_id, created_at DESC);

COMMENT ON COLUMN public.security_audit_log.session_id IS 'Browser session identifier for tracking';
COMMENT ON COLUMN public.security_audit_log.event_category IS 'Category: auth, data_access, admin, security, upload';
COMMENT ON COLUMN public.security_audit_log.severity IS 'Severity: info, warn, error, critical';

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_event_category TEXT DEFAULT 'general',
  p_severity TEXT DEFAULT 'info',
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    event_category,
    severity,
    old_values,
    new_values,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_event_category,
    p_severity,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    p_session_id
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Update RLS policies to use has_role function (more secure, no recursion)
-- This is just an example for cases table, similar updates needed for others
DROP POLICY IF EXISTS "Admins can view all cases" ON public.cases;
CREATE POLICY "Admins can view all cases"
ON public.cases FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all cases" ON public.cases;
CREATE POLICY "Admins can update all cases"
ON public.cases FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete all cases" ON public.cases;
CREATE POLICY "Admins can delete all cases"
ON public.cases FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Reporters can view all cases" ON public.cases;
CREATE POLICY "Reporters can view all cases"
ON public.cases FOR SELECT
USING (public.has_role(auth.uid(), 'reporter'));

DROP POLICY IF EXISTS "Reporters can update case status" ON public.cases;
CREATE POLICY "Reporters can update case status"
ON public.cases FOR UPDATE
USING (public.has_role(auth.uid(), 'reporter'));
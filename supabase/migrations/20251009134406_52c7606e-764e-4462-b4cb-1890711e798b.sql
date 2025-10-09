-- Fix critical security issues from security scan

-- 1. CRITICAL: Add authentication requirement to profiles table
-- Drop existing policies that don't check authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate with authentication requirement
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated' AND get_current_user_role() = 'admin');

-- 2. CRITICAL: Add authentication requirement to auth_secrets table
-- This table should NEVER allow SELECT by users, only through security definer functions
-- Current policies are correct (no SELECT policy for users)
-- But ensure no anonymous access is possible
DROP POLICY IF EXISTS "Users can view own secrets" ON public.auth_secrets;

-- 3. Fix function search_path issues
-- Update functions to have explicit search_path set

-- Fix notify_status_change function
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the status change without sending HTTP notifications
  RAISE LOG 'Case % status changed from % to %', NEW.id, OLD.status, NEW.status;
  RETURN NEW;
END;
$$;

-- Fix auto_assign_case_to_reporter function
CREATE OR REPLACE FUNCTION public.auto_assign_case_to_reporter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID;
BEGIN
  -- Get the first reporter or admin
  SELECT id INTO v_reporter_id 
  FROM profiles 
  WHERE role IN ('reporter', 'admin')
  ORDER BY created_at
  LIMIT 1;
  
  -- Assign case to reporter if found
  IF v_reporter_id IS NOT NULL THEN
    NEW.status := 'uploaded';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Restrict clinic data visibility
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Clinics viewable by authenticated users" ON public.clinics;

-- Create restricted policy - clinics can only see their own data
CREATE POLICY "Clinics view own data" 
ON public.clinics 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  (id = get_current_user_clinic() OR get_current_user_role() = 'admin')
);

-- 5. Secure notifications system - prevent spam/abuse
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only allow service role or verified system operations to insert notifications
CREATE POLICY "Authorized system can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Only service role can insert notifications
  auth.jwt() ->> 'role' = 'service_role' OR
  -- Or admin users can create notifications
  get_current_user_role() = 'admin'
);

-- 6. Secure login_attempts table
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- Restrict to service role only
CREATE POLICY "Service role can insert login attempts" 
ON public.login_attempts 
FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- 7. Add additional security check for cases table
-- Ensure authentication is explicitly required
DROP POLICY IF EXISTS "Clinics can view own cases" ON public.cases;
DROP POLICY IF EXISTS "Reporters can view all cases" ON public.cases;
DROP POLICY IF EXISTS "Admins can view all cases" ON public.cases;

CREATE POLICY "Clinics can view own cases" 
ON public.cases 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  clinic_id = get_current_user_clinic()
);

CREATE POLICY "Reporters can view all cases" 
ON public.cases 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  has_role(auth.uid(), 'reporter'::app_role)
);

CREATE POLICY "Admins can view all cases" 
ON public.cases 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add comment documenting security measures
COMMENT ON TABLE public.profiles IS 'Security: All access requires authentication. Users can only see their own profile unless they are admins.';
COMMENT ON TABLE public.auth_secrets IS 'Security: No direct SELECT access. All access must go through security definer functions.';
COMMENT ON TABLE public.clinics IS 'Security: Clinics can only view their own data. Admins have full access.';
COMMENT ON TABLE public.notifications IS 'Security: Only service role and admins can create notifications to prevent spam.';
COMMENT ON TABLE public.login_attempts IS 'Security: Only service role can insert records to prevent manipulation.';
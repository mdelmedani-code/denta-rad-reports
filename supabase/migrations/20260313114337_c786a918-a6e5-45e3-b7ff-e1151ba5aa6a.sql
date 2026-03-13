
-- CRITICAL FIX 1: Fix profiles RLS privilege escalation
-- The current policy (role = role) compares new value to itself, always true
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
CREATE POLICY "Users can update own profile except role"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- CRITICAL FIX 2: Restrict signature_audit from anonymous access
DROP POLICY IF EXISTS "Anyone can verify signatures" ON public.signature_audit;
CREATE POLICY "Authenticated users can verify signatures"
ON public.signature_audit
FOR SELECT
TO authenticated
USING (true);

-- CRITICAL FIX 3: Add RLS policies to billable_reports view
-- billable_reports is a VIEW so we need to enable RLS and add policies
ALTER VIEW public.billable_reports SET (security_invoker = true);

-- FIX 4: Restrict security_audit_log INSERT to authenticated users
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- FIX 5: Remove insecure email-based fallback from get_current_user_clinic
CREATE OR REPLACE FUNCTION public.get_current_user_clinic()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT clinic_id
  FROM public.profiles 
  WHERE id = auth.uid();
$function$;

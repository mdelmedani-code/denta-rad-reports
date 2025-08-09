-- Fix critical privilege escalation vulnerability
-- Drop the existing problematic policy that allows users to update their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies with proper role protection
CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent role changes unless user is admin
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

-- Admin-only policy for role changes
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create trigger function for role change auditing
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      'role_change',
      'profiles',
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change auditing
CREATE TRIGGER audit_profile_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();
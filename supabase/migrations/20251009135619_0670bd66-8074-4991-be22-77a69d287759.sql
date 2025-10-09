-- Fix user registration flow to properly assign roles
-- user_role enum: 'clinic', 'admin'
-- app_role enum: 'admin', 'clinic', 'reporter'

-- Update handle_new_user function to also create role in user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'clinic');
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinic'::app_role);
  
  RETURN NEW;
END;
$$;

-- Migrate existing profiles to user_roles (only for users not already in user_roles)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  CASE p.role
    WHEN 'clinic' THEN 'clinic'::app_role
    WHEN 'admin' THEN 'admin'::app_role
    ELSE 'clinic'::app_role  -- Default to clinic
  END as role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

-- Update get_current_user_clinic function to handle clinic_id properly
CREATE OR REPLACE FUNCTION public.get_current_user_clinic()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      clinic_id,
      -- If clinic_id is null, try to find clinic by email
      (
        SELECT id FROM clinics 
        WHERE contact_email = (
          SELECT email FROM profiles WHERE id = auth.uid()
        )
        LIMIT 1
      )
    )
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

-- Auto-create clinic for new clinic users
CREATE OR REPLACE FUNCTION public.ensure_clinic_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
  v_email TEXT;
BEGIN
  -- Only for clinic users
  IF NEW.role = 'clinic' AND NEW.clinic_id IS NULL THEN
    -- Get user email
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
    
    -- Check if clinic exists for this email
    SELECT id INTO v_clinic_id 
    FROM clinics 
    WHERE contact_email = v_email 
    LIMIT 1;
    
    -- If no clinic exists, create one
    IF v_clinic_id IS NULL THEN
      INSERT INTO clinics (name, contact_email)
      VALUES (
        COALESCE(
          SPLIT_PART(v_email, '@', 1),  -- Use email prefix as clinic name
          'Default Clinic'
        ),
        v_email
      )
      RETURNING id INTO v_clinic_id;
    END IF;
    
    -- Set the clinic_id
    NEW.clinic_id := v_clinic_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating clinics
DROP TRIGGER IF EXISTS ensure_clinic_trigger ON public.profiles;
CREATE TRIGGER ensure_clinic_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_clinic_for_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and user_role entries for new auth users';
COMMENT ON FUNCTION public.ensure_clinic_for_user IS 'Automatically creates clinic for new clinic users if one does not exist';
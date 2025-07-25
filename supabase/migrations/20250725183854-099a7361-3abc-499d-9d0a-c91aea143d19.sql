-- Fix remaining functions with search path issues
DROP FUNCTION IF EXISTS get_current_user_role();
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

DROP FUNCTION IF EXISTS get_current_user_clinic();
CREATE OR REPLACE FUNCTION public.get_current_user_clinic()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'clinic');
  RETURN NEW;
END;
$$;
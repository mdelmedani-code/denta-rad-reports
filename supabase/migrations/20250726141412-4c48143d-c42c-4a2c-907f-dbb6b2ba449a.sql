-- Allow admins to manage clinics
CREATE POLICY "Admins can manage all clinics" 
ON public.clinics 
FOR ALL 
TO authenticated 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Allow admins to insert profiles (for creating test users)
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (get_current_user_role() = 'admin');

-- Insert a test clinic
INSERT INTO public.clinics (name, contact_email, address) 
VALUES (
  'Test Dental Clinic',
  'test@testclinic.com',
  '123 Test Street, Test City, TC 12345'
);

-- Get the clinic ID for the test clinic (we'll use this in a follow-up)
-- Note: We'll create the test user profile separately after this migration
-- Create a placeholder test user profile for the test clinic
-- Note: You'll need to update the ID with the actual auth user ID once created
INSERT INTO public.profiles (id, email, role, clinic_id) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, -- Placeholder UUID - replace with real auth user ID
  'clinic@testclinic.com',
  'clinic',
  '82542c76-b16a-4ffb-b086-c8b825c5a33b'::uuid
);
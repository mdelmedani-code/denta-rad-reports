-- Create the test clinic user profile
INSERT INTO public.profiles (id, email, role, clinic_id) 
VALUES (
  '896e6006-c314-45c5-96d9-3a7523893ca6'::uuid,
  'clinic@testclinic.com',
  'clinic',
  '82542c76-b16a-4ffb-b086-c8b825c5a33b'::uuid
);
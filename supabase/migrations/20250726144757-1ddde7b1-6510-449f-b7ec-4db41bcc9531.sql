-- Update the existing profile to link it to the test clinic
UPDATE public.profiles 
SET 
  role = 'clinic',
  clinic_id = '82542c76-b16a-4ffb-b086-c8b825c5a33b'::uuid
WHERE id = '896e6006-c314-45c5-96d9-3a7523893ca6'::uuid;
-- Update the test user to have admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'clinic@testclinic.com';
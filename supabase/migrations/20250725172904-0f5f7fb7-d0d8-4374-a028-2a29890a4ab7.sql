-- First, create a clinic for the admin to be associated with (optional but recommended)
INSERT INTO public.clinics (name, contact_email)
VALUES ('DentaRad Administration', 'admin@dentarad.co.uk')
ON CONFLICT DO NOTHING;

-- Note: You'll need to manually create the auth user first, then update this with the actual user ID
-- This is just a placeholder - replace with actual admin user ID after creating the user
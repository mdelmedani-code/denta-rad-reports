-- Ensure all existing clinic users have clinics and proper clinic_id values

-- First, create clinics for any clinic users that don't have one
INSERT INTO clinics (name, contact_email)
SELECT 
  COALESCE(SPLIT_PART(p.email, '@', 1), 'Default Clinic') as name,
  p.email as contact_email
FROM profiles p
WHERE p.role = 'clinic'
  AND p.clinic_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM clinics c WHERE c.contact_email = p.email
  );

-- Then, update all clinic profiles to link to their clinics
UPDATE profiles p
SET clinic_id = c.id
FROM clinics c
WHERE p.role = 'clinic'
  AND p.clinic_id IS NULL
  AND c.contact_email = p.email;
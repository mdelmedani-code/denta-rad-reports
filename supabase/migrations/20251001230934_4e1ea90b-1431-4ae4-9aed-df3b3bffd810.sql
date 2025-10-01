-- Drop the unused case_studies view that exposes patient data
-- The cases table already has proper RLS policies
DROP VIEW IF EXISTS public.case_studies CASCADE;
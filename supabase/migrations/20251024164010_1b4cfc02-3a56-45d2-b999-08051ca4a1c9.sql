-- Clear all test cases and related data
-- Order matters: delete dependent records first to avoid foreign key violations

-- 1. Delete all report shares (depends on reports)
DELETE FROM public.report_shares;

-- 2. Delete all case annotations (depends on cases)
DELETE FROM public.case_annotations;

-- 3. Delete all reports (depends on cases)
DELETE FROM public.reports;

-- 4. Delete all invoices (depends on cases)
DELETE FROM public.invoices;

-- 5. Delete all cases (main table)
DELETE FROM public.cases;

-- 6. Reset the case patient sequence for clean IDs
ALTER SEQUENCE IF EXISTS public.case_patient_seq RESTART WITH 1;

-- 7. Reset the simple_id sequence for clean IDs
ALTER SEQUENCE IF EXISTS public.cases_simple_id_seq RESTART WITH 1;
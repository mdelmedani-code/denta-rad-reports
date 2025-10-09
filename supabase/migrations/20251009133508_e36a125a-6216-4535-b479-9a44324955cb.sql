-- Fix billable_reports view to use SECURITY INVOKER
-- This ensures the view respects RLS policies of the querying user

DROP VIEW IF EXISTS public.billable_reports;

CREATE VIEW public.billable_reports
WITH (security_invoker = true)
AS
SELECT 
  r.id AS report_id,
  r.case_id,
  c.clinic_id,
  cl.name AS clinic_name,
  cl.contact_email AS clinic_email,
  c.patient_name,
  c.field_of_view::text AS field_of_view,
  c.created_at AS case_date,
  r.finalized_at AS report_date,
  CASE c.field_of_view
    WHEN 'up_to_5x5'::field_of_view THEN 125.00
    WHEN 'up_to_8x5'::field_of_view THEN 145.00
    WHEN 'up_to_8x8'::field_of_view THEN 165.00
    WHEN 'over_8x8'::field_of_view THEN 185.00
    ELSE 125.00
  END AS amount,
  EXISTS (
    SELECT 1 FROM invoices i WHERE i.case_id = c.id
  ) AS has_invoice,
  (
    SELECT invoices.stripe_invoice_id 
    FROM invoices 
    WHERE invoices.case_id = c.id 
    LIMIT 1
  ) AS stripe_invoice_id
FROM reports r
JOIN cases c ON r.case_id = c.id
JOIN clinics cl ON c.clinic_id = cl.id
WHERE r.finalized_at IS NOT NULL
ORDER BY r.finalized_at DESC;

-- Add comment documenting security model
COMMENT ON VIEW public.billable_reports IS 
  'Security: Uses SECURITY INVOKER to respect RLS policies from underlying tables. Access controlled by policies on cases, reports, and clinics tables.';
-- Update get_unbilled_reports to include urgency
CREATE OR REPLACE FUNCTION public.get_unbilled_reports(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(clinic_name text, clinic_email text, report_count bigint, total_amount numeric, cases json)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.name as clinic_name,
    c.contact_email as clinic_email,
    COUNT(cases.id) as report_count,
    SUM(calculate_case_price(cases.field_of_view, cases.urgency, ARRAY[]::TEXT[])) as total_amount,
    json_agg(
      json_build_object(
        'patient_name', cases.patient_name,
        'patient_id', cases.patient_id,
        'patient_internal_id', cases.patient_internal_id,
        'report_date', COALESCE(r.signed_at, r.completed_at, r.finalized_at),
        'amount', calculate_case_price(cases.field_of_view, cases.urgency, ARRAY[]::TEXT[]),
        'case_id', cases.id,
        'field_of_view', cases.field_of_view,
        'urgency', cases.urgency
      )
    ) as cases
  FROM cases
  JOIN clinics c ON cases.clinic_id = c.id
  JOIN reports r ON r.case_id = cases.id AND r.is_latest = true AND r.is_signed = true
  WHERE cases.billed = false
    AND cases.status = 'report_ready'
    AND (p_start_date IS NULL OR COALESCE(r.signed_at, r.completed_at, r.finalized_at)::date >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(r.signed_at, r.completed_at, r.finalized_at)::date <= p_end_date)
  GROUP BY c.name, c.contact_email
  ORDER BY c.name;
END;
$function$;
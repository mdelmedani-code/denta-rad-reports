-- Update income stats functions to use report_ready status
CREATE OR REPLACE FUNCTION public.get_weekly_income_stats()
 RETURNS TABLE(projected_income numeric, income_so_far numeric, total_cases bigint, reported_cases bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  week_start DATE;
  week_end DATE;
BEGIN
  -- Calculate current week (Monday to Sunday)
  week_start := date_trunc('week', CURRENT_DATE);
  week_end := week_start + INTERVAL '6 days';
  
  -- Get projected income (all cases this week)
  SELECT 
    COALESCE(SUM(calculate_case_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[])), 0),
    COUNT(*)
  INTO projected_income, total_cases
  FROM cases c
  WHERE DATE(c.upload_date) >= week_start 
    AND DATE(c.upload_date) <= week_end;
  
  -- Get income so far (report_ready cases this week)
  SELECT 
    COALESCE(SUM(calculate_case_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[])), 0),
    COUNT(*)
  INTO income_so_far, reported_cases
  FROM cases c
  WHERE DATE(c.upload_date) >= week_start 
    AND DATE(c.upload_date) <= week_end
    AND c.status = 'report_ready';
    
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_income_stats()
 RETURNS TABLE(projected_income numeric, income_so_far numeric, total_cases bigint, reported_cases bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  month_start DATE;
  month_end DATE;
BEGIN
  -- Calculate current month
  month_start := date_trunc('month', CURRENT_DATE);
  month_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Get projected income (all cases this month)
  SELECT 
    COALESCE(SUM(calculate_case_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[])), 0),
    COUNT(*)
  INTO projected_income, total_cases
  FROM cases c
  WHERE DATE(c.upload_date) >= month_start 
    AND DATE(c.upload_date) <= month_end;
  
  -- Get income so far (report_ready cases this month)
  SELECT 
    COALESCE(SUM(calculate_case_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[])), 0),
    COUNT(*)
  INTO income_so_far, reported_cases
  FROM cases c
  WHERE DATE(c.upload_date) >= month_start 
    AND DATE(c.upload_date) <= month_end
    AND c.status = 'report_ready';
    
  RETURN NEXT;
END;
$function$;
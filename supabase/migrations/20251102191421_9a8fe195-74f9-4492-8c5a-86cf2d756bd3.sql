-- Fix remaining SECURITY DEFINER functions missing SET search_path

-- Fix auto_pseudonymize_old_cases function
CREATE OR REPLACE FUNCTION public.auto_pseudonymize_old_cases()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE cases
  SET 
    patient_name = '[ARCHIVED]',
    patient_internal_id = '[ARCHIVED]',
    clinical_question = '[ARCHIVED]',
    deleted_at = NOW(),
    deletion_reason = 'Auto-archived after 8-year retention period'
  WHERE 
    status = 'report_ready'
    AND created_at < NOW() - INTERVAL '8 years'
    AND deleted_at IS NULL;
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE 'Auto-pseudonymized % old cases', affected_rows;
  
  RETURN affected_rows;
END;
$function$;

-- Fix mark_previous_reports_not_latest function
CREATE OR REPLACE FUNCTION public.mark_previous_reports_not_latest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark all previous versions as not latest
  UPDATE reports 
  SET is_latest = false
  WHERE case_id = NEW.case_id 
    AND id != NEW.id 
    AND is_latest = true;
  
  RETURN NEW;
END;
$function$;
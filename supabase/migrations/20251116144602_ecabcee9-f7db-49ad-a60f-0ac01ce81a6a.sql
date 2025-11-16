-- Update the trigger to set completed_at when report is finalized
CREATE OR REPLACE FUNCTION public.update_case_on_report_finalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.finalized_at IS NOT NULL AND (OLD.finalized_at IS NULL OR OLD.finalized_at IS DISTINCT FROM NEW.finalized_at) THEN
    UPDATE cases 
    SET 
      status = 'report_ready',
      completed_at = NEW.finalized_at
    WHERE id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure existing reports have completed_at set
UPDATE cases c
SET completed_at = r.finalized_at
FROM reports r
WHERE c.id = r.case_id
  AND r.finalized_at IS NOT NULL
  AND c.completed_at IS NULL;
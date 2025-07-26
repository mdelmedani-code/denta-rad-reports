-- Remove the problematic trigger that references net schema
DROP TRIGGER IF EXISTS notify_status_change_trigger ON public.cases;

-- Recreate the function without the net.http_post call for now
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- For now, just log the status change without sending HTTP notifications
  -- TODO: Implement proper notification system
  RAISE LOG 'Case % status changed from % to %', NEW.id, OLD.status, NEW.status;
  
  RETURN NEW;
END;
$function$

-- Recreate the trigger
CREATE TRIGGER notify_status_change_trigger
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_status_change();
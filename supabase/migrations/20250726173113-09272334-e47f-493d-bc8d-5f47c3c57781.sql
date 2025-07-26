-- Recreate the trigger
CREATE TRIGGER notify_status_change_trigger
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_status_change();
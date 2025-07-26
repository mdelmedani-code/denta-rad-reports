-- Temporarily disable the status change trigger to fix the reporting issue
-- The trigger is trying to use the 'net' extension which doesn't exist
DROP TRIGGER IF EXISTS notify_status_change_trigger ON public.cases;
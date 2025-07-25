-- Update the status change notification function to check user preferences
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger AS $$
DECLARE
  clinic_user_id UUID;
  user_preferences JSONB;
BEGIN
  -- Only send notification if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the clinic user ID and their notification preferences
    SELECT id, notification_preferences INTO clinic_user_id, user_preferences
    FROM public.profiles 
    WHERE clinic_id = NEW.clinic_id AND role = 'clinic' 
    LIMIT 1;
    
    -- Check if user wants status change notifications
    IF clinic_user_id IS NOT NULL AND 
       (user_preferences->>'email_status_changes')::boolean = true THEN
      PERFORM net.http_post(
        url := 'https://swusayoygknritombbwg.supabase.co/functions/v1/send-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'type', 'status_change',
          'recipientId', clinic_user_id,
          'data', json_build_object(
            'caseId', NEW.id,
            'patientName', NEW.patient_name,
            'oldStatus', OLD.status,
            'newStatus', NEW.status
          )
        )::text::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
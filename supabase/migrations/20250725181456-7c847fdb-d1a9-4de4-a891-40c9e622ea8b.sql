-- Create database functions to send notifications via edge function

-- Function to send new case notification to admins
CREATE OR REPLACE FUNCTION public.notify_new_case()
RETURNS trigger AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Send notification to all admins
  FOR admin_record IN 
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    PERFORM net.http_post(
      url := 'https://swusayoygknritombbwg.supabase.co/functions/v1/send-notification',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'type', 'new_case',
        'recipientId', admin_record.id,
        'data', json_build_object(
          'caseId', NEW.id,
          'patientName', NEW.patient_name,
          'clinicName', (SELECT name FROM public.clinics WHERE id = NEW.clinic_id),
          'clinicalQuestion', NEW.clinical_question,
          'urgency', NEW.urgency
        )
      )::text::jsonb
    );
    
    -- If urgent, send urgent notification too
    IF NEW.urgency = 'urgent' THEN
      PERFORM net.http_post(
        url := 'https://swusayoygknritombbwg.supabase.co/functions/v1/send-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'type', 'urgent_case',
          'recipientId', admin_record.id,
          'data', json_build_object(
            'caseId', NEW.id,
            'patientName', NEW.patient_name,
            'clinicName', (SELECT name FROM public.clinics WHERE id = NEW.clinic_id),
            'clinicalQuestion', NEW.clinical_question,
            'urgency', NEW.urgency
          )
        )::text::jsonb
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send status change notification to clinic
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger AS $$
DECLARE
  clinic_user_id UUID;
BEGIN
  -- Only send notification if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the clinic user ID
    SELECT id INTO clinic_user_id 
    FROM public.profiles 
    WHERE clinic_id = NEW.clinic_id AND role = 'clinic' 
    LIMIT 1;
    
    IF clinic_user_id IS NOT NULL THEN
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

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_case ON public.cases;
CREATE TRIGGER trigger_notify_new_case
  AFTER INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_case();

DROP TRIGGER IF EXISTS trigger_notify_status_change ON public.cases;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_status_change();
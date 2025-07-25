-- Create monthly invoices table with clinic separation
CREATE TABLE public.monthly_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  case_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(clinic_id, month, year)
);

-- Add monthly billing columns to cases table
ALTER TABLE public.cases 
ADD COLUMN monthly_billed BOOLEAN DEFAULT FALSE,
ADD COLUMN monthly_invoice_id UUID REFERENCES public.monthly_invoices(id);

-- Enable RLS on monthly invoices
ALTER TABLE public.monthly_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly invoices
CREATE POLICY "Clinics can view their own monthly invoices" 
ON public.monthly_invoices 
FOR SELECT 
USING (clinic_id = get_current_user_clinic());

CREATE POLICY "Admins can view all monthly invoices" 
ON public.monthly_invoices 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all monthly invoices" 
ON public.monthly_invoices 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Function to generate monthly invoice number
CREATE OR REPLACE FUNCTION public.generate_monthly_invoice_number(p_clinic_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  clinic_name TEXT;
  invoice_num TEXT;
BEGIN
  -- Get clinic name for invoice number
  SELECT name INTO clinic_name FROM public.clinics WHERE id = p_clinic_id;
  
  -- Format as CLI-CLINICNAME-YYYY-MM
  invoice_num := 'CLI-' || UPPER(REPLACE(COALESCE(clinic_name, 'UNKNOWN'), ' ', '')) || '-' || p_year || '-' || LPAD(p_month::TEXT, 2, '0');
  
  RETURN invoice_num;
END;
$$;

-- Function to generate monthly invoices for all clinics
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices()
RETURNS TABLE(clinic_id UUID, invoice_id UUID, total_amount DECIMAL, case_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_month INTEGER;
  target_year INTEGER;
  clinic_record RECORD;
  invoice_record RECORD;
  total_cases BIGINT;
  total_amount DECIMAL(10,2);
  new_invoice_id UUID;
BEGIN
  -- Calculate previous month
  SELECT EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::INTEGER,
         EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::INTEGER
  INTO target_month, target_year;
  
  -- Process each clinic that has completed cases in the target month
  FOR clinic_record IN
    SELECT DISTINCT c.clinic_id, cl.name as clinic_name
    FROM public.cases c
    JOIN public.clinics cl ON c.clinic_id = cl.id
    WHERE c.status = 'completed'
      AND c.monthly_billed = FALSE
      AND EXTRACT(MONTH FROM c.updated_at) = target_month
      AND EXTRACT(YEAR FROM c.updated_at) = target_year
  LOOP
    -- Calculate totals for this clinic
    SELECT COUNT(*), 
           COALESCE(SUM(calculate_case_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[])), 0)
    INTO total_cases, total_amount
    FROM public.cases c
    WHERE c.clinic_id = clinic_record.clinic_id
      AND c.status = 'completed'
      AND c.monthly_billed = FALSE
      AND EXTRACT(MONTH FROM c.updated_at) = target_month
      AND EXTRACT(YEAR FROM c.updated_at) = target_year;
    
    -- Skip if no cases found
    IF total_cases = 0 THEN
      CONTINUE;
    END IF;
    
    -- Create monthly invoice for this clinic
    INSERT INTO public.monthly_invoices (
      clinic_id,
      invoice_number,
      month,
      year,
      total_amount,
      case_count
    ) VALUES (
      clinic_record.clinic_id,
      generate_monthly_invoice_number(clinic_record.clinic_id, target_month, target_year),
      target_month,
      target_year,
      total_amount,
      total_cases
    ) RETURNING id INTO new_invoice_id;
    
    -- Update cases to mark as monthly billed
    UPDATE public.cases 
    SET monthly_billed = TRUE,
        monthly_invoice_id = new_invoice_id
    WHERE clinic_id = clinic_record.clinic_id
      AND status = 'completed'
      AND monthly_billed = FALSE
      AND EXTRACT(MONTH FROM updated_at) = target_month
      AND EXTRACT(YEAR FROM updated_at) = target_year;
    
    -- Return the invoice details
    clinic_id := clinic_record.clinic_id;
    invoice_id := new_invoice_id;
    total_amount := total_amount;
    case_count := total_cases;
    RETURN NEXT;
    
  END LOOP;
  
END;
$$;

-- Schedule monthly invoice generation (requires pg_cron extension)
-- This will run on the 1st of every month at 9 AM UTC
SELECT cron.schedule(
  'generate-monthly-invoices',
  '0 9 1 * *',
  $$
  SELECT public.generate_monthly_invoices();
  $$
);
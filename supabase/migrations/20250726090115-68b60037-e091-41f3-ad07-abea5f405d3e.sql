-- Create storage bucket for PDF reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Create policies for report PDFs
CREATE POLICY "Report PDFs are viewable by authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload report PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reports' AND get_current_user_role() = 'admin');

CREATE POLICY "Admins can update report PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'reports' AND get_current_user_role() = 'admin');

-- Add secure sharing functionality
CREATE TABLE public.report_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for report shares
CREATE POLICY "Admins can manage all report shares" 
ON public.report_shares 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Clinics can view shares for their reports" 
ON public.report_shares 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.cases c ON r.case_id = c.id
    WHERE r.id = report_shares.report_id 
    AND c.clinic_id = get_current_user_clinic()
  )
);

-- Create function to generate secure share links
CREATE OR REPLACE FUNCTION public.create_report_share(p_report_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  share_token TEXT;
BEGIN
  -- Generate a secure random token
  share_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert the share record
  INSERT INTO public.report_shares (report_id, share_token, created_by)
  VALUES (p_report_id, share_token, auth.uid());
  
  RETURN share_token;
END;
$$;

-- Rate limiting table for registration submissions
CREATE TABLE public.registration_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_registration_submissions_ip_time 
  ON public.registration_submissions (ip_address, submitted_at);

-- Auto-cleanup: delete entries older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_registration_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.registration_submissions
  WHERE submitted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- RLS: no client access needed, only service_role from edge function
ALTER TABLE public.registration_submissions ENABLE ROW LEVEL SECURITY;

-- Make reports bucket private
UPDATE storage.buckets SET public = false WHERE id = 'reports';

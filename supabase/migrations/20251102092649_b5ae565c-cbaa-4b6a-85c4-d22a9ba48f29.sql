-- Add case notes fields for clinic-reporter communication
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS special_instructions text,
ADD COLUMN IF NOT EXISTS reporter_notes text;
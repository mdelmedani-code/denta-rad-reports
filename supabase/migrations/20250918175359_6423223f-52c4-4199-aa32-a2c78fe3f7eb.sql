-- Add column to store pre-generated ZIP file path
ALTER TABLE public.cases 
ADD COLUMN pregenerated_zip_path TEXT;

-- Add column to track ZIP generation status
ALTER TABLE public.cases 
ADD COLUMN zip_generation_status TEXT DEFAULT 'pending' CHECK (zip_generation_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add index for faster queries on ZIP status
CREATE INDEX idx_cases_zip_status ON public.cases(zip_generation_status);

-- Add updated timestamp trigger for cases table
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
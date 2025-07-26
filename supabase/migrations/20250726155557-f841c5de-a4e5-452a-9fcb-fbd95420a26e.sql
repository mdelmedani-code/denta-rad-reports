-- Create annotations table to store drawing data
CREATE TABLE public.case_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_data JSONB NOT NULL, -- Fabric.js canvas data
  annotation_type TEXT NOT NULL DEFAULT 'drawing', -- 'drawing', 'measurement', 'text'
  image_index INTEGER DEFAULT 0, -- For multi-image DICOM series
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_annotations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all annotations
CREATE POLICY "Admins can manage all annotations" 
ON public.case_annotations 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Clinics can view annotations for their cases
CREATE POLICY "Clinics can view annotations for their cases" 
ON public.case_annotations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = case_annotations.case_id 
  AND cases.clinic_id = get_current_user_clinic()
));

-- Users can create annotations for cases they have access to
CREATE POLICY "Users can create annotations" 
ON public.case_annotations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_annotations.case_id 
    AND (
      cases.clinic_id = get_current_user_clinic() 
      OR get_current_user_role() = 'admin'
    )
  )
);

-- Users can update their own annotations
CREATE POLICY "Users can update own annotations" 
ON public.case_annotations 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_case_annotations_updated_at
BEFORE UPDATE ON public.case_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
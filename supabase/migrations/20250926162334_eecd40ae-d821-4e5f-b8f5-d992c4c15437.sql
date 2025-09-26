-- Add indication-based template system
-- First, add an indication field to pdf_templates to categorize them
ALTER TABLE public.pdf_templates ADD COLUMN indication_type TEXT;

-- Add a default indication type to existing template
UPDATE public.pdf_templates 
SET indication_type = 'general' 
WHERE indication_type IS NULL;

-- Create a table to map clinical questions to template categories
CREATE TABLE public.template_indications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indication_name TEXT NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  template_id UUID REFERENCES public.pdf_templates(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template_indications
ALTER TABLE public.template_indications ENABLE ROW LEVEL SECURITY;

-- Create policies for template_indications
CREATE POLICY "Admins can manage all template indications" 
ON public.template_indications 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'admin');

-- Insert some common dental indications
INSERT INTO public.template_indications (indication_name, description, keywords) VALUES
('implant_planning', 'Implant Planning and Assessment', ARRAY['implant', 'placement', 'bone density', 'osseointegration']),
('impacted_teeth', 'Impacted Teeth Evaluation', ARRAY['impacted', 'wisdom', 'third molar', 'extraction']),
('orthodontic', 'Orthodontic Assessment', ARRAY['orthodontic', 'alignment', 'malocclusion', 'bite']),
('pathology', 'Pathology and Lesion Detection', ARRAY['pathology', 'lesion', 'cyst', 'tumor', 'abnormality']),
('tmj', 'TMJ Analysis', ARRAY['tmj', 'temporomandibular', 'joint', 'jaw pain']),
('endodontic', 'Endodontic Assessment', ARRAY['root canal', 'endodontic', 'apex', 'infection']),
('periodontal', 'Periodontal Evaluation', ARRAY['periodontal', 'bone loss', 'gum disease', 'pocket']),
('general', 'General Diagnostic', ARRAY['general', 'routine', 'diagnostic', 'evaluation']);

-- Create function to auto-detect indication based on clinical question
CREATE OR REPLACE FUNCTION public.detect_indication_from_clinical_question(clinical_question TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  indication_record RECORD;
  keyword TEXT;
BEGIN
  -- Convert clinical question to lowercase for case-insensitive matching
  clinical_question := LOWER(clinical_question);
  
  -- Loop through all indications
  FOR indication_record IN 
    SELECT indication_name, keywords 
    FROM public.template_indications 
    ORDER BY indication_name
  LOOP
    -- Check if any keywords match
    FOREACH keyword IN ARRAY indication_record.keywords
    LOOP
      IF clinical_question LIKE '%' || LOWER(keyword) || '%' THEN
        RETURN indication_record.indication_name;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Default to general if no match found
  RETURN 'general';
END;
$$;

-- Create function to get template for indication
CREATE OR REPLACE FUNCTION public.get_template_for_indication(indication_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Try to find a specific template for this indication
  SELECT ti.template_id INTO template_id
  FROM public.template_indications ti
  WHERE ti.indication_name = indication_name
    AND ti.template_id IS NOT NULL;
  
  -- If no specific template found, get the active general template
  IF template_id IS NULL THEN
    SELECT id INTO template_id
    FROM public.pdf_templates
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN template_id;
END;
$$;

-- Add trigger to update updated_at on template_indications
CREATE TRIGGER update_template_indications_updated_at
BEFORE UPDATE ON public.template_indications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
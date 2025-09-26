-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.detect_indication_from_clinical_question(clinical_question TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.get_template_for_indication(indication_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
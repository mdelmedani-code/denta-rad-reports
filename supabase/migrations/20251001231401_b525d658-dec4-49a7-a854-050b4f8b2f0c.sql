-- Fix ambiguous column reference in get_template_for_indication function
DROP FUNCTION IF EXISTS public.get_template_for_indication(text);

CREATE OR REPLACE FUNCTION public.get_template_for_indication(p_indication_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  template_id UUID;
BEGIN
  -- Try to find a specific template for this indication
  SELECT ti.template_id INTO template_id
  FROM public.template_indications ti
  WHERE ti.indication_name = p_indication_name
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
$function$;
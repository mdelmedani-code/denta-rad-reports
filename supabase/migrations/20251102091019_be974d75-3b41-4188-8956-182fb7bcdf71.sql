-- Update calculate_case_price function to use 50% surcharge for urgent cases
CREATE OR REPLACE FUNCTION public.calculate_case_price(p_field_of_view field_of_view, p_urgency urgency_level, p_addons text[] DEFAULT '{}'::text[])
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_price numeric;
  urgency_surcharge numeric := 0;
  addon_total numeric := 0;
  addon_prices jsonb := '{
    "airway_analysis": 75,
    "tmj_analysis": 100,
    "implant_planning": 125,
    "orthodontic_analysis": 85,
    "pathology_screening": 60,
    "ian_nerve_tracing_left": 50,
    "ian_nerve_tracing_right": 50
  }';
  addon text;
BEGIN
  -- Set base price based on field of view
  CASE p_field_of_view
    WHEN 'up_to_5x5' THEN base_price := 125;
    WHEN 'up_to_8x5' THEN base_price := 145;
    WHEN 'up_to_8x8' THEN base_price := 165;
    WHEN 'over_8x8' THEN base_price := 185;
    ELSE base_price := 125;
  END CASE;
  
  -- Add 50% urgency surcharge for 24-hour turnaround
  IF p_urgency = 'urgent' THEN
    urgency_surcharge := base_price * 0.5;
  END IF;
  
  -- Calculate addon costs
  IF p_addons IS NOT NULL THEN
    FOREACH addon IN ARRAY p_addons
    LOOP
      addon_total := addon_total + COALESCE((addon_prices->addon)::numeric, 0);
    END LOOP;
  END IF;
  
  RETURN base_price + urgency_surcharge + addon_total;
END;
$function$;
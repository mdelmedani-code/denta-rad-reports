
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
    "ian_nerve_tracing_right": 50,
    "opg_standalone": 75,
    "opg_bundle": 20
  }';
  addon text;
BEGIN
  CASE p_field_of_view
    WHEN 'up_to_5x5' THEN base_price := 130;
    WHEN 'up_to_8x5' THEN base_price := 150;
    WHEN 'up_to_8x8' THEN base_price := 170;
    WHEN 'over_8x8' THEN base_price := 195;
    ELSE base_price := 130;
  END CASE;
  
  IF p_urgency = 'urgent' THEN
    urgency_surcharge := 50;
  END IF;
  
  IF p_addons IS NOT NULL THEN
    FOREACH addon IN ARRAY p_addons
    LOOP
      addon_total := addon_total + COALESCE((addon_prices->addon)::numeric, 0);
    END LOOP;
  END IF;
  
  RETURN base_price + urgency_surcharge + addon_total;
END;
$function$;

UPDATE pricing_rules SET price = 75 WHERE field_of_view = 'opg_standalone';

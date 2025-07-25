-- Drop the existing function first
DROP FUNCTION IF EXISTS public.calculate_case_price(field_of_view, urgency_level, text[]);

-- Update field_of_view enum to match landing page pricing tiers
ALTER TYPE field_of_view RENAME TO field_of_view_old;

CREATE TYPE field_of_view AS ENUM ('up_to_5x5', 'up_to_8x5', 'up_to_8x8', 'over_8x8');

-- Update cases table to use new enum
ALTER TABLE cases ALTER COLUMN field_of_view DROP DEFAULT;
ALTER TABLE cases ALTER COLUMN field_of_view TYPE field_of_view USING 
  CASE 
    WHEN field_of_view::text = 'small' THEN 'up_to_5x5'::field_of_view
    WHEN field_of_view::text = 'large' THEN 'up_to_8x8'::field_of_view
    ELSE 'up_to_5x5'::field_of_view
  END;
ALTER TABLE cases ALTER COLUMN field_of_view SET DEFAULT 'up_to_5x5';

-- Create the updated calculate_case_price function with new pricing structure
CREATE OR REPLACE FUNCTION public.calculate_case_price(
  p_field_of_view field_of_view,
  p_urgency urgency_level,
  p_addons text[] DEFAULT '{}'
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  -- Set base price based on field of view (matching landing page)
  CASE p_field_of_view
    WHEN 'up_to_5x5' THEN base_price := 125;
    WHEN 'up_to_8x5' THEN base_price := 145;
    WHEN 'up_to_8x8' THEN base_price := 165;
    WHEN 'over_8x8' THEN base_price := 185;
    ELSE base_price := 125;
  END CASE;
  
  -- Add urgency surcharge (fixed £50 for priority service)
  IF p_urgency = 'urgent' THEN
    urgency_surcharge := 50;
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
$$;

-- Drop old enum
DROP TYPE field_of_view_old;
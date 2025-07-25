-- Fix search path security issues for functions
DROP FUNCTION IF EXISTS generate_invoice_number();
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM public.invoices;
  
  -- Format as INV-000001, INV-000002, etc.
  invoice_num := 'INV-' || LPAD(counter::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$$;

DROP FUNCTION IF EXISTS calculate_case_price(field_of_view, urgency_level, TEXT[]);
CREATE OR REPLACE FUNCTION calculate_case_price(
  p_field_of_view field_of_view,
  p_urgency urgency_level,
  p_addons TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS DECIMAL(10,2) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_price DECIMAL(10,2) := 150.00; -- Base price for small FOV, standard urgency
  final_price DECIMAL(10,2);
  addon TEXT;
BEGIN
  -- Start with base price
  final_price := base_price;
  
  -- Adjust for field of view
  IF p_field_of_view = 'large' THEN
    final_price := final_price + 100.00; -- +$100 for large FOV
  END IF;
  
  -- Adjust for urgency
  IF p_urgency = 'urgent' THEN
    final_price := final_price * 1.5; -- 50% surcharge for urgent
  END IF;
  
  -- Add addon costs
  IF p_addons IS NOT NULL THEN
    FOREACH addon IN ARRAY p_addons
    LOOP
      CASE addon
        WHEN 'airway_analysis' THEN final_price := final_price + 75.00;
        WHEN 'tmj_analysis' THEN final_price := final_price + 100.00;
        WHEN 'implant_planning' THEN final_price := final_price + 125.00;
        WHEN 'orthodontic_analysis' THEN final_price := final_price + 85.00;
        WHEN 'pathology_screening' THEN final_price := final_price + 60.00;
        ELSE
          -- Unknown addon, skip
          NULL;
      END CASE;
    END LOOP;
  END IF;
  
  RETURN final_price;
END;
$$;

DROP FUNCTION IF EXISTS create_case_invoice();
CREATE OR REPLACE FUNCTION create_case_invoice()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_price DECIMAL(10,2);
  line_items_json JSONB;
  addon_costs JSONB := '[]'::jsonb;
  addon TEXT;
BEGIN
  -- Calculate the total price
  calculated_price := calculate_case_price(NEW.field_of_view, NEW.urgency, ARRAY['airway_analysis']); -- placeholder addons
  
  -- Build line items JSON
  line_items_json := jsonb_build_array(
    jsonb_build_object(
      'description', 'CBCT Scan Analysis (' || NEW.field_of_view || ' FOV, ' || NEW.urgency || ')',
      'quantity', 1,
      'unit_price', calculated_price,
      'total', calculated_price
    )
  );
  
  -- Insert the invoice
  INSERT INTO public.invoices (
    case_id,
    clinic_id,
    amount,
    invoice_number,
    line_items
  ) VALUES (
    NEW.id,
    NEW.clinic_id,
    calculated_price,
    generate_invoice_number(),
    line_items_json
  );
  
  RETURN NEW;
END;
$$;
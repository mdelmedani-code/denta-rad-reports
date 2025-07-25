-- Drop trigger first, then recreate function with proper search path
DROP TRIGGER IF EXISTS create_invoice_on_case_upload ON public.cases;

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
BEGIN
  -- Calculate the total price (using placeholder addons for now)
  calculated_price := calculate_case_price(NEW.field_of_view, NEW.urgency, ARRAY[]::TEXT[]);
  
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

-- Recreate trigger
CREATE TRIGGER create_invoice_on_case_upload
  AFTER INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION create_case_invoice();
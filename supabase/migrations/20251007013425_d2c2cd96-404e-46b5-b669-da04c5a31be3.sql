-- =====================================================
-- FIX: Add search_path to new functions for security
-- =====================================================

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION generate_invoice_number(p_clinic_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq_num INTEGER;
BEGIN
  v_seq_num := nextval('invoice_number_seq');
  RETURN 'INV-' || SUBSTRING(p_clinic_id::TEXT, 1, 8) || '-' || LPAD(v_seq_num::TEXT, 6, '0');
END;
$$;

-- Fix calculate_report_price function
CREATE OR REPLACE FUNCTION calculate_report_price(p_case_id UUID)
RETURNS DECIMAL 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fov TEXT;
  v_price DECIMAL;
  v_urgency TEXT;
  v_urgency_surcharge DECIMAL := 0;
BEGIN
  -- Get field of view and urgency from case
  SELECT field_of_view, urgency INTO v_fov, v_urgency FROM cases WHERE id = p_case_id;
  
  -- Get current price for this FOV
  SELECT price INTO v_price 
  FROM pricing_rules 
  WHERE field_of_view = v_fov 
    AND effective_from <= NOW() 
    AND (effective_to IS NULL OR effective_to > NOW())
  ORDER BY effective_from DESC 
  LIMIT 1;
  
  -- Add urgency surcharge if urgent
  IF v_urgency = 'urgent' THEN
    v_urgency_surcharge := 50.00;
  END IF;
  
  -- Return price with urgency surcharge or default
  RETURN COALESCE(v_price, 125.00) + v_urgency_surcharge;
END;
$$;

-- Fix create_case_invoice trigger function
CREATE OR REPLACE FUNCTION create_case_invoice()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
  v_price DECIMAL;
  v_invoice_number TEXT;
BEGIN
  -- Only proceed if report is being finalized for first time
  IF NEW.finalized_at IS NOT NULL AND (OLD.finalized_at IS NULL OR OLD.finalized_at IS DISTINCT FROM NEW.finalized_at) THEN
    
    -- Get clinic ID from case
    SELECT clinic_id INTO v_clinic_id FROM cases WHERE id = NEW.case_id;
    
    -- Calculate price
    v_price := calculate_report_price(NEW.case_id);
    
    -- Generate invoice number
    v_invoice_number := generate_invoice_number(v_clinic_id);
    
    -- Insert invoice with conflict handling
    INSERT INTO invoices (
      clinic_id,
      case_id,
      amount,
      currency,
      status,
      invoice_number,
      created_at
    )
    VALUES (
      v_clinic_id,
      NEW.case_id,
      v_price,
      'GBP',
      'pending',
      v_invoice_number,
      NOW()
    )
    ON CONFLICT (case_id, clinic_id) DO UPDATE
    SET 
      amount = EXCLUDED.amount,
      updated_at = NOW();
    
    -- Update case status to report_ready
    UPDATE cases SET status = 'report_ready' WHERE id = NEW.case_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix finalize_report_transaction function
CREATE OR REPLACE FUNCTION finalize_report_transaction(
  p_report_id UUID,
  p_findings TEXT,
  p_impression TEXT,
  p_recommendations TEXT
) 
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id UUID;
  v_clinic_id UUID;
  v_invoice_id UUID;
  v_price DECIMAL;
BEGIN
  -- Everything in one atomic transaction
  
  -- 1. Update report (this will trigger invoice creation)
  UPDATE reports 
  SET 
    report_text = p_findings || E'\n\nIMPRESSION:\n' || p_impression || 
                  CASE WHEN p_recommendations IS NOT NULL AND p_recommendations != '' 
                       THEN E'\n\nRECOMMENDATIONS:\n' || p_recommendations 
                       ELSE '' END,
    finalized_at = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id
  RETURNING case_id INTO v_case_id;
  
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;
  
  -- 2. Get clinic ID
  SELECT clinic_id INTO v_clinic_id FROM cases WHERE id = v_case_id;
  
  -- 3. Get invoice ID (created by trigger)
  SELECT id INTO v_invoice_id 
  FROM invoices 
  WHERE case_id = v_case_id AND clinic_id = v_clinic_id;
  
  -- 4. Calculate price for response
  v_price := calculate_report_price(v_case_id);
  
  -- Return success with IDs
  RETURN json_build_object(
    'success', true,
    'report_id', p_report_id,
    'case_id', v_case_id,
    'invoice_id', v_invoice_id,
    'price', v_price
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Roll back everything on error
  RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;
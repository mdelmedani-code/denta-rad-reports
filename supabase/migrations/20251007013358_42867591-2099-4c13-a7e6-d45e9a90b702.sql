-- =====================================================
-- MIGRATION: Fix Reporting System - Security & Integrity
-- =====================================================

-- 1. Add unique constraint to prevent duplicate invoices
-- =====================================================
ALTER TABLE invoices 
ADD CONSTRAINT unique_case_invoice 
UNIQUE (case_id, clinic_id);

-- 2. Create invoice number sequence (prevents race conditions)
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- 3. Function to generate invoice numbers atomically
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_clinic_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_seq_num INTEGER;
BEGIN
  v_seq_num := nextval('invoice_number_seq');
  RETURN 'INV-' || SUBSTRING(p_clinic_id::TEXT, 1, 8) || '-' || LPAD(v_seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create pricing rules table
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_of_view TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_fov CHECK (field_of_view IN ('up_to_5x5', 'up_to_8x5', 'up_to_8x8', 'over_8x8')),
  CONSTRAINT positive_price CHECK (price > 0)
);

-- Insert current pricing
INSERT INTO pricing_rules (field_of_view, price) VALUES
  ('up_to_5x5', 125.00),
  ('up_to_8x5', 145.00),
  ('up_to_8x8', 165.00),
  ('over_8x8', 185.00)
ON CONFLICT DO NOTHING;

-- 5. Function to calculate report price
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_report_price(p_case_id UUID)
RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add finalized_at column to reports if it doesn't exist
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE reports ADD COLUMN finalized_at TIMESTAMPTZ;
  END IF;
END $$;

-- 7. Improved invoice creation trigger
-- =====================================================
CREATE OR REPLACE FUNCTION create_case_invoice()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if it exists
DROP TRIGGER IF EXISTS create_case_invoice_trigger ON reports;
CREATE TRIGGER create_case_invoice_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION create_case_invoice();

-- 8. Create atomic report finalization function
-- =====================================================
CREATE OR REPLACE FUNCTION finalize_report_transaction(
  p_report_id UUID,
  p_findings TEXT,
  p_impression TEXT,
  p_recommendations TEXT
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create PDF generation log table for monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'success', 'failed')),
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_pdf_logs_report_id ON pdf_generation_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_status ON pdf_generation_logs(status);

-- 10. Enable RLS on new tables
-- =====================================================
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_generation_logs ENABLE ROW LEVEL SECURITY;

-- 11. Add RLS policies
-- =====================================================

-- Pricing rules: Admins can manage, everyone can read
CREATE POLICY "Admins can manage pricing rules"
ON pricing_rules FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Everyone can view pricing rules"
ON pricing_rules FOR SELECT
TO authenticated
USING (true);

-- PDF logs: Admins can view all, users can view their own
CREATE POLICY "Admins can view all pdf logs"
ON pdf_generation_logs FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their pdf logs"
ON pdf_generation_logs FOR SELECT
TO authenticated
USING (
  report_id IN (
    SELECT r.id FROM reports r
    JOIN cases c ON r.case_id = c.id
    WHERE c.clinic_id = get_current_user_clinic()
    OR r.author_id = auth.uid()
  )
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_report_price(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_report_transaction(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION finalize_report_transaction IS 'Atomically finalize report, create invoice, and update case status';
COMMENT ON TABLE pricing_rules IS 'Stores pricing rules for different FOV types with effective dates';
COMMENT ON TABLE pdf_generation_logs IS 'Logs PDF generation attempts for monitoring and debugging';
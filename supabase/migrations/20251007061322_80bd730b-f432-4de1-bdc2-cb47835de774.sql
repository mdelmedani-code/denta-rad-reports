-- =====================================================
-- MIGRATION: Simplify Invoicing for Small Scale
-- =====================================================

-- 1. Drop complex invoice tables (keep basic tracking)
DROP TABLE IF EXISTS monthly_invoices CASCADE;

-- 2. Simplify invoices table (keep minimal info)
ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_number CASCADE;
ALTER TABLE invoices DROP COLUMN IF EXISTS due_date CASCADE;
ALTER TABLE invoices DROP COLUMN IF EXISTS line_items CASCADE;

-- Add simple tracking fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- 3. Create simple billable reports view
CREATE OR REPLACE VIEW billable_reports AS
SELECT 
  r.id as report_id,
  r.case_id,
  c.clinic_id,
  cl.name as clinic_name,
  cl.contact_email as clinic_email,
  c.patient_name,
  c.field_of_view::text,
  c.created_at as case_date,
  r.finalized_at as report_date,
  CASE c.field_of_view
    WHEN 'up_to_5x5' THEN 125.00
    WHEN 'up_to_8x5' THEN 145.00
    WHEN 'up_to_8x8' THEN 165.00
    WHEN 'over_8x8' THEN 185.00
    ELSE 125.00
  END as amount,
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.case_id = c.id
  ) as has_invoice,
  (
    SELECT stripe_invoice_id 
    FROM invoices 
    WHERE case_id = c.id 
    LIMIT 1
  ) as stripe_invoice_id
FROM reports r
JOIN cases c ON r.case_id = c.id
JOIN clinics cl ON c.clinic_id = cl.id
WHERE r.finalized_at IS NOT NULL
ORDER BY r.finalized_at DESC;

-- 4. Remove complex invoice trigger
DROP TRIGGER IF EXISTS create_case_invoice_trigger ON reports;
DROP FUNCTION IF EXISTS create_case_invoice CASCADE;

-- Simple trigger just updates case status
CREATE OR REPLACE FUNCTION update_case_on_report_finalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finalized_at IS NOT NULL AND (OLD.finalized_at IS NULL OR OLD.finalized_at IS DISTINCT FROM NEW.finalized_at) THEN
    UPDATE cases SET status = 'report_ready' WHERE id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_case_on_finalize
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_case_on_report_finalize();

-- 5. Create simple export function
CREATE OR REPLACE FUNCTION get_unbilled_reports(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
  clinic_name TEXT,
  clinic_email TEXT,
  report_count BIGINT,
  total_amount DECIMAL,
  cases JSON
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.clinic_name,
    br.clinic_email,
    COUNT(*) as report_count,
    SUM(br.amount) as total_amount,
    json_agg(
      json_build_object(
        'patient_name', br.patient_name,
        'report_date', br.report_date,
        'amount', br.amount,
        'case_id', br.case_id
      )
    ) as cases
  FROM billable_reports br
  WHERE br.has_invoice = false
    AND (p_start_date IS NULL OR br.report_date >= p_start_date)
    AND (p_end_date IS NULL OR br.report_date <= p_end_date)
  GROUP BY br.clinic_name, br.clinic_email
  ORDER BY br.clinic_name;
END;
$$;

-- 6. Auto-assign cases to first reporter/admin
CREATE OR REPLACE FUNCTION auto_assign_case_to_reporter()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID;
BEGIN
  -- Get the first reporter or admin
  SELECT id INTO v_reporter_id 
  FROM profiles 
  WHERE role IN ('reporter', 'admin')
  ORDER BY created_at
  LIMIT 1;
  
  -- Assign case to reporter if found
  IF v_reporter_id IS NOT NULL THEN
    NEW.status := 'uploaded';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_case_on_creation
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_case_to_reporter();

-- Grant permissions
GRANT SELECT ON billable_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_unbilled_reports TO authenticated;

-- Drop unused functions
DROP FUNCTION IF EXISTS generate_invoice_number(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_report_price CASCADE;
DROP FUNCTION IF EXISTS generate_monthly_invoices CASCADE;
DROP FUNCTION IF EXISTS generate_monthly_invoice_number CASCADE;
DROP FUNCTION IF EXISTS finalize_report_transaction CASCADE;

COMMENT ON VIEW billable_reports IS 'Simple view of all billable reports for manual invoicing';
COMMENT ON FUNCTION get_unbilled_reports IS 'Export unbilled reports for Stripe/manual invoicing';
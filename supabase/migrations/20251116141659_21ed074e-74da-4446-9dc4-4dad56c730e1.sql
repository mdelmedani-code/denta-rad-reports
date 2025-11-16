-- Add invoice status enum if not exists
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update invoices table with status tracking
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Update the status column to use the enum if it exists
DO $$ BEGIN
  ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::invoice_status;
EXCEPTION
  WHEN OTHERS THEN
    -- If column doesn't exist or conversion fails, set default
    ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft';
END $$;

-- Function to automatically mark cases as billed when invoice is paid
CREATE OR REPLACE FUNCTION mark_cases_billed_on_invoice_payment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If invoice status changed to 'paid', mark all associated cases as billed
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE cases
    SET 
      billed = true,
      billed_at = now(),
      monthly_billed = true,
      monthly_invoice_id = NEW.id
    WHERE id = ANY(NEW.case_ids);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-marking cases as billed
DROP TRIGGER IF EXISTS invoice_payment_mark_cases ON invoices;
CREATE TRIGGER invoice_payment_mark_cases
  AFTER INSERT OR UPDATE OF status
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION mark_cases_billed_on_invoice_payment();

-- Function to check for overdue invoices
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status IN ('draft', 'sent')
    AND due_date < CURRENT_DATE
    AND status != 'paid';
END;
$$;
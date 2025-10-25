-- Add Stripe integration fields to clinics table
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

COMMENT ON COLUMN clinics.stripe_customer_id IS 
  'Stripe customer ID for this clinic (e.g., cus_...)';

-- Add billing tracking fields to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;

-- Create index for efficient billing queries
CREATE INDEX IF NOT EXISTS idx_cases_unbilled 
ON cases(billed, status, created_at) 
WHERE billed = false AND status = 'report_ready';

-- Create index for payment tracking
CREATE INDEX IF NOT EXISTS idx_cases_payment_received
ON cases(payment_received, clinic_id, billed)
WHERE billed = true;

COMMENT ON COLUMN cases.billed IS 'Whether this case has been included in an invoice';
COMMENT ON COLUMN cases.billed_at IS 'When this case was marked as billed';
COMMENT ON COLUMN cases.stripe_invoice_id IS 'Stripe invoice ID if applicable';
COMMENT ON COLUMN cases.payment_received IS 'Whether payment has been received for this case';
COMMENT ON COLUMN cases.payment_received_at IS 'When payment was received';
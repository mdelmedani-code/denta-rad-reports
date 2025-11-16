-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false, -- Private bucket, only accessible via RLS
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- RLS policies for invoice storage
CREATE POLICY "Admins can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can read all invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Clinics can read own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  -- Extract clinic_id from file path (format: clinic_id/invoice-xxx.pdf)
  (storage.foldername(name))[1]::uuid IN (
    SELECT clinic_id FROM profiles WHERE id = auth.uid()
  )
);

-- Update invoices table to store PDF and case references
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
ADD COLUMN IF NOT EXISTS case_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);

-- Update RLS policies for invoices table to allow clinics to view their own invoices
DROP POLICY IF EXISTS "Clinics can view their own invoices" ON invoices;
CREATE POLICY "Clinics can view their own invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  clinic_id = get_current_user_clinic() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
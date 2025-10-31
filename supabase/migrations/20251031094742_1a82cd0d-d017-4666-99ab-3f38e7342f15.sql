-- Add missing columns required by CreateInvoicePage
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]'::jsonb;
# Complex Invoice System - Backup Documentation

**Created:** 2025-01-07  
**Purpose:** Reference for future system upgrades when scaling beyond 30-50 scans/week

This document contains all the code removed during the simplification to a manual invoicing system. Use this as a reference when you need to restore automated invoice generation at scale.

---

## 🗄️ Database Schema (Removed)

### Complex Invoice Tables

```sql
-- Monthly Invoice Aggregation Table (REMOVED)
CREATE TABLE monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  due_date DATE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, month_start)
);

-- Invoice Line Items Table (REMOVED)
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complex Invoice Columns (REMOVED from invoices table)
ALTER TABLE invoices ADD COLUMN invoice_number TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN due_date DATE;
ALTER TABLE invoices ADD COLUMN payment_method TEXT;
ALTER TABLE invoices ADD COLUMN payment_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN notes TEXT;
ALTER TABLE invoices ADD COLUMN line_items JSONB;
```

### Indexes for Performance

```sql
-- Removed Indexes
CREATE INDEX idx_monthly_invoices_clinic ON monthly_invoices(clinic_id);
CREATE INDEX idx_monthly_invoices_status ON monthly_invoices(status);
CREATE INDEX idx_monthly_invoices_month ON monthly_invoices(month_start, month_end);
CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_line_items_case ON invoice_line_items(case_id);
```

---

## 🔧 Database Functions (Removed)

### 1. Invoice Number Generation

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  counter INTEGER;
  invoice_num TEXT;
  year_month TEXT;
BEGIN
  -- Format: INV-202501-0001
  year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  
  -- Get next sequential number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{6}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM monthly_invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  invoice_num := 'INV-' || year_month || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;
```

### 2. Complex Report Pricing

```sql
CREATE OR REPLACE FUNCTION calculate_report_price(
  p_field_of_view TEXT,
  p_urgency TEXT,
  p_addons TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS DECIMAL AS $$
DECLARE
  base_price DECIMAL := 35.00;
  urgency_multiplier DECIMAL := 1.0;
  addon_price DECIMAL := 0.00;
  addon TEXT;
BEGIN
  -- Field of view pricing
  CASE p_field_of_view
    WHEN 'small' THEN base_price := 25.00;
    WHEN 'medium' THEN base_price := 35.00;
    WHEN 'large' THEN base_price := 50.00;
    WHEN 'maxillofacial' THEN base_price := 75.00;
    ELSE base_price := 35.00;
  END CASE;
  
  -- Urgency multiplier
  IF p_urgency = 'urgent' THEN
    urgency_multiplier := 1.5;
  ELSIF p_urgency = 'rush' THEN
    urgency_multiplier := 2.0;
  END IF;
  
  -- Add-on services
  FOREACH addon IN ARRAY p_addons LOOP
    CASE addon
      WHEN 'implant_planning' THEN addon_price := addon_price + 15.00;
      WHEN 'airway_analysis' THEN addon_price := addon_price + 20.00;
      WHEN 'tmj_assessment' THEN addon_price := addon_price + 25.00;
      WHEN 'pathology_screening' THEN addon_price := addon_price + 10.00;
      ELSE addon_price := addon_price + 0.00;
    END CASE;
  END LOOP;
  
  RETURN (base_price * urgency_multiplier) + addon_price;
END;
$$ LANGUAGE plpgsql;
```

### 3. Automatic Invoice Creation Trigger

```sql
-- Trigger function to auto-create invoice when report finalized
CREATE OR REPLACE FUNCTION create_case_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_case_record RECORD;
  v_invoice_id UUID;
  v_price DECIMAL;
BEGIN
  -- Only proceed if report just got finalized
  IF NEW.finalized_at IS NOT NULL AND OLD.finalized_at IS NULL THEN
    
    -- Get case details
    SELECT * INTO v_case_record
    FROM cases
    WHERE id = NEW.case_id;
    
    -- Calculate price
    v_price := calculate_report_price(
      v_case_record.field_of_view,
      v_case_record.urgency,
      ARRAY[]::TEXT[]  -- Add-ons would come from case data
    );
    
    -- Create invoice
    INSERT INTO invoices (
      case_id,
      clinic_id,
      amount,
      status,
      created_at
    )
    VALUES (
      NEW.case_id,
      v_case_record.clinic_id,
      v_price,
      'pending',
      NOW()
    )
    RETURNING id INTO v_invoice_id;
    
    -- Update case with invoice reference
    UPDATE cases
    SET 
      status = 'report_ready',
      invoice_id = v_invoice_id
    WHERE id = NEW.case_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER create_case_invoice_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION create_case_invoice();
```

### 4. Monthly Invoice Aggregation

```sql
CREATE OR REPLACE FUNCTION aggregate_monthly_invoices(
  p_clinic_id UUID,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS UUID AS $$
DECLARE
  v_monthly_invoice_id UUID;
  v_subtotal DECIMAL := 0;
  v_tax_rate DECIMAL := 0.20;  -- 20% VAT
  v_tax_amount DECIMAL;
  v_total DECIMAL;
  v_invoice_number TEXT;
  v_case_record RECORD;
BEGIN
  -- Generate invoice number
  v_invoice_number := generate_invoice_number();
  
  -- Calculate totals from all finalized reports in period
  SELECT 
    SUM(calculate_report_price(c.field_of_view, c.urgency, ARRAY[]::TEXT[]))
  INTO v_subtotal
  FROM cases c
  JOIN reports r ON r.case_id = c.id
  WHERE c.clinic_id = p_clinic_id
    AND r.finalized_at >= p_month_start
    AND r.finalized_at <= p_month_end
    AND r.finalized_at IS NOT NULL;
  
  -- Calculate tax and total
  v_tax_amount := v_subtotal * v_tax_rate;
  v_total := v_subtotal + v_tax_amount;
  
  -- Create monthly invoice
  INSERT INTO monthly_invoices (
    clinic_id,
    invoice_number,
    month_start,
    month_end,
    subtotal,
    tax_amount,
    total_amount,
    status,
    due_date,
    issued_at
  )
  VALUES (
    p_clinic_id,
    v_invoice_number,
    p_month_start,
    p_month_end,
    v_subtotal,
    v_tax_amount,
    v_total,
    'sent',
    p_month_end + INTERVAL '14 days',
    NOW()
  )
  RETURNING id INTO v_monthly_invoice_id;
  
  -- Create line items for each case
  FOR v_case_record IN
    SELECT 
      c.id as case_id,
      c.patient_name,
      c.field_of_view,
      c.urgency,
      r.finalized_at
    FROM cases c
    JOIN reports r ON r.case_id = c.id
    WHERE c.clinic_id = p_clinic_id
      AND r.finalized_at >= p_month_start
      AND r.finalized_at <= p_month_end
      AND r.finalized_at IS NOT NULL
  LOOP
    INSERT INTO invoice_line_items (
      invoice_id,
      case_id,
      description,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      v_monthly_invoice_id,
      v_case_record.case_id,
      'CBCT Report - ' || v_case_record.patient_name || ' (' || v_case_record.field_of_view || ')',
      1,
      calculate_report_price(v_case_record.field_of_view, v_case_record.urgency, ARRAY[]::TEXT[]),
      calculate_report_price(v_case_record.field_of_view, v_case_record.urgency, ARRAY[]::TEXT[])
    );
  END LOOP;
  
  RETURN v_monthly_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. Payment Status Update

```sql
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id UUID,
  p_payment_method TEXT DEFAULT 'bank_transfer'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE monthly_invoices
  SET 
    status = 'paid',
    paid_at = NOW(),
    payment_method = p_payment_method
  WHERE id = p_invoice_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ⚡ Edge Functions (Removed)

### generate-monthly-invoices

**File:** `supabase/functions/generate-monthly-invoices/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  clinic_id?: string;
  month_start?: string;
  month_end?: string;
  auto_send?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clinic_id, month_start, month_end, auto_send = false }: InvoiceRequest = 
      await req.json();

    // Default to last month if not specified
    const start = month_start || new Date(
      new Date().getFullYear(), 
      new Date().getMonth() - 1, 
      1
    ).toISOString().split('T')[0];
    
    const end = month_end || new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      0
    ).toISOString().split('T')[0];

    // Get clinics to invoice
    let clinicsQuery = supabase
      .from('clinics')
      .select('id, name, email');
    
    if (clinic_id) {
      clinicsQuery = clinicsQuery.eq('id', clinic_id);
    }

    const { data: clinics, error: clinicsError } = await clinicsQuery;

    if (clinicsError) throw clinicsError;

    const results = [];

    for (const clinic of clinics) {
      // Check if clinic has any finalized reports in period
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          case_id,
          cases!inner(clinic_id)
        `)
        .eq('cases.clinic_id', clinic.id)
        .gte('finalized_at', start)
        .lte('finalized_at', end)
        .not('finalized_at', 'is', null);

      if (reportsError) throw reportsError;

      if (!reports || reports.length === 0) {
        results.push({
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          status: 'skipped',
          reason: 'no_reports_in_period'
        });
        continue;
      }

      // Generate monthly invoice
      const { data: invoice, error: invoiceError } = await supabase
        .rpc('aggregate_monthly_invoices', {
          p_clinic_id: clinic.id,
          p_month_start: start,
          p_month_end: end
        });

      if (invoiceError) {
        results.push({
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          status: 'error',
          error: invoiceError.message
        });
        continue;
      }

      // Send email notification if auto_send enabled
      if (auto_send) {
        // Call send-notification edge function
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'invoice_generated',
            clinic_id: clinic.id,
            invoice_id: invoice
          })
        });
      }

      results.push({
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        status: 'success',
        invoice_id: invoice,
        email_sent: auto_send
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        period: { start, end },
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating invoices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
```

### Cron Job Configuration

**File:** `supabase/functions/_cron/monthly-invoices.ts` (REMOVED)

```typescript
// Scheduled to run on 1st of each month at 9:00 AM
// Cron: 0 9 1 * *

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get last month's date range
const today = new Date();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

const month_start = lastMonth.toISOString().split('T')[0];
const month_end = lastMonthEnd.toISOString().split('T')[0];

// Trigger invoice generation for all clinics
const response = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-monthly-invoices`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      month_start,
      month_end,
      auto_send: true
    })
  }
);

const result = await response.json();
console.log('Monthly invoice generation completed:', result);
```

---

## 🎨 Frontend Components (Removed)

### InvoiceManagement.tsx

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Download, Send, Check, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MonthlyInvoice {
  id: string;
  clinic_id: string;
  clinic_name: string;
  clinic_email: string;
  invoice_number: string;
  month_start: string;
  month_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  issued_at: string;
  paid_at?: string;
  line_items: Array<{
    case_id: string;
    patient_name: string;
    description: string;
    amount: number;
  }>;
}

export function InvoiceManagement() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [generatingInvoices, setGeneratingInvoices] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [selectedMonth]);

  async function loadInvoices() {
    try {
      setLoading(true);
      
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      ).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('monthly_invoices')
        .select(`
          *,
          clinics!inner(name, email),
          invoice_line_items(*)
        `)
        .gte('month_start', monthStart)
        .lte('month_end', monthEnd)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const formattedInvoices = data.map(inv => ({
        ...inv,
        clinic_name: inv.clinics.name,
        clinic_email: inv.clinics.email,
        line_items: inv.invoice_line_items
      }));

      setInvoices(formattedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoices',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateMonthlyInvoices() {
    try {
      setGeneratingInvoices(true);

      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      ).toISOString().split('T')[0];

      const { data, error } = await supabase.functions.invoke(
        'generate-monthly-invoices',
        {
          body: {
            month_start: monthStart,
            month_end: monthEnd,
            auto_send: false
          }
        }
      );

      if (error) throw error;

      toast({
        title: 'Invoices Generated',
        description: `Successfully generated ${data.results.length} invoices`
      });

      loadInvoices();
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoices',
        variant: 'destructive'
      });
    } finally {
      setGeneratingInvoices(false);
    }
  }

  async function sendInvoice(invoiceId: string) {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'invoice_ready',
          invoice_id: invoiceId
        }
      });

      if (error) throw error;

      // Update status to sent
      await supabase
        .from('monthly_invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

      toast({
        title: 'Invoice Sent',
        description: 'Invoice email sent to clinic'
      });

      loadInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invoice',
        variant: 'destructive'
      });
    }
  }

  async function markAsPaid(invoiceId: string) {
    try {
      const { error } = await supabase.rpc('mark_invoice_paid', {
        p_invoice_id: invoiceId,
        p_payment_method: 'bank_transfer'
      });

      if (error) throw error;

      toast({
        title: 'Invoice Updated',
        description: 'Marked as paid'
      });

      loadInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice',
        variant: 'destructive'
      });
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Invoice Management</h1>
          <p className="text-gray-600">Generate and manage monthly invoices</p>
        </div>

        <div className="flex gap-4 items-center">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
          <button
            onClick={generateMonthlyInvoices}
            disabled={generatingInvoices}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Generate Month Invoices
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Clinic
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No invoices for selected period
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 font-mono text-sm">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{invoice.clinic_name}</p>
                    <p className="text-sm text-gray-500">{invoice.clinic_email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {format(new Date(invoice.month_start), 'MMM d')} - 
                    {format(new Date(invoice.month_end), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    £{invoice.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => sendInvoice(invoice.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Send Invoice"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => markAsPaid(invoice.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Mark as Paid"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {/* Download PDF */}}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 📊 Invoice Service Logic (Removed)

**File:** `src/services/invoiceService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceLineItem {
  case_id: string;
  patient_name: string;
  description: string;
  field_of_view: string;
  urgency: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface MonthlyInvoiceSummary {
  clinic_id: string;
  clinic_name: string;
  clinic_email: string;
  month_start: string;
  month_end: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

/**
 * Calculate invoice summary for a clinic for a specific month
 */
export async function calculateMonthlyInvoice(
  clinicId: string,
  monthStart: string,
  monthEnd: string
): Promise<MonthlyInvoiceSummary | null> {
  try {
    // Get clinic info
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, email')
      .eq('id', clinicId)
      .single();

    if (clinicError || !clinic) return null;

    // Get all finalized reports in period
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id,
        case_id,
        finalized_at,
        cases!inner(
          id,
          patient_name,
          field_of_view,
          urgency,
          clinic_id
        )
      `)
      .eq('cases.clinic_id', clinicId)
      .gte('finalized_at', monthStart)
      .lte('finalized_at', monthEnd)
      .not('finalized_at', 'is', null);

    if (reportsError) throw reportsError;
    if (!reports || reports.length === 0) return null;

    // Calculate pricing for each report
    const lineItems: InvoiceLineItem[] = reports.map(report => {
      const case_data = report.cases;
      const price = calculateReportPrice(
        case_data.field_of_view,
        case_data.urgency
      );

      return {
        case_id: case_data.id,
        patient_name: case_data.patient_name,
        description: `CBCT Report - ${case_data.patient_name} (${case_data.field_of_view})`,
        field_of_view: case_data.field_of_view,
        urgency: case_data.urgency,
        unit_price: price,
        quantity: 1,
        total_price: price
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
    const tax_rate = 0.20; // 20% VAT
    const tax_amount = subtotal * tax_rate;
    const total_amount = subtotal + tax_amount;

    return {
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      clinic_email: clinic.email,
      month_start: monthStart,
      month_end: monthEnd,
      line_items: lineItems,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount
    };

  } catch (error) {
    console.error('Error calculating monthly invoice:', error);
    return null;
  }
}

/**
 * Client-side price calculation (matches database function)
 */
function calculateReportPrice(
  fieldOfView: string,
  urgency: string
): number {
  let basePrice = 35.00;

  // FOV pricing
  switch (fieldOfView) {
    case 'small': basePrice = 25.00; break;
    case 'medium': basePrice = 35.00; break;
    case 'large': basePrice = 50.00; break;
    case 'maxillofacial': basePrice = 75.00; break;
  }

  // Urgency multiplier
  let multiplier = 1.0;
  if (urgency === 'urgent') multiplier = 1.5;
  if (urgency === 'rush') multiplier = 2.0;

  return basePrice * multiplier;
}

/**
 * Generate PDF invoice (would integrate with PDF generation service)
 */
export async function generateInvoicePDF(
  invoiceData: MonthlyInvoiceSummary
): Promise<Blob> {
  // This would call your PDF generation service
  // For now, placeholder
  throw new Error('PDF generation not implemented in backup');
}

/**
 * Send invoice email to clinic
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  clinicEmail: string
): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'invoice_ready',
        invoice_id: invoiceId,
        recipient_email: clinicEmail
      }
    });

    return !error;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}
```

---

## 🔄 Migration Path (Future Restoration)

### When to Restore Complex System

Consider restoring automated invoicing when:

- Processing > 50 scans/week consistently
- Managing > 15 active clinics
- Spending > 2 hours/month on manual invoicing
- Clinics requesting automated billing
- Need to scale to 100+ scans/week

### Restoration Steps

1. **Database Schema**
   ```sql
   -- Run the database schema creation scripts above
   -- Restore tables: monthly_invoices, invoice_line_items
   -- Restore functions: generate_invoice_number, calculate_report_price, etc.
   -- Restore triggers: create_case_invoice_trigger
   ```

2. **Edge Functions**
   ```bash
   # Restore edge function
   cp BACKUP_COMPLEX_INVOICE_SYSTEM.md sections to:
   # supabase/functions/generate-monthly-invoices/index.ts
   
   # Deploy
   supabase functions deploy generate-monthly-invoices
   ```

3. **Frontend Components**
   ```bash
   # Restore components
   # src/pages/InvoiceManagement.tsx
   # src/services/invoiceService.ts
   
   # Add route to App.tsx
   # <Route path="/invoices" element={<InvoiceManagement />} />
   ```

4. **Configuration**
   - Set up cron job for monthly generation
   - Configure email templates
   - Test with sample data
   - Migrate existing data

### Cost Implications of Restoration

**Additional Monthly Costs:**
- Supabase Pro: $25/month (if exceeding free tier)
- Edge function executions: ~$1-5/month
- Email service: ~$10-20/month (Resend/SendGrid)
- **Total: ~$35-50/month additional**

### Integration with Stripe (Alternative)

Instead of complex custom system, consider Stripe Invoicing:
- Use Stripe's invoice API
- Simpler than custom system
- Still automated
- Professional presentation
- Handles payments
- Cost: 2.9% + £0.30 per transaction only

---

## 🛡️ Security Considerations

The removed complex system had these security features:

1. **RLS Policies on Invoice Tables**
   ```sql
   -- Clinics can only see their own invoices
   CREATE POLICY "Clinics view own invoices"
     ON monthly_invoices FOR SELECT
     USING (clinic_id = get_current_user_clinic());
   
   -- Only admins can create/modify invoices
   CREATE POLICY "Admins manage invoices"
     ON monthly_invoices FOR ALL
     USING (get_current_user_role() = 'admin');
   ```

2. **Invoice Number Uniqueness**
   - Sequential generation prevents duplicates
   - Format: INV-202501-0001
   - Includes month for easy sorting

3. **Payment Verification**
   - Status tracking (draft → sent → paid)
   - Payment method recording
   - Timestamp audit trail

---

## 📈 Analytics & Reporting

The complex system tracked:

1. **Revenue Metrics**
   - Monthly recurring revenue (MRR)
   - Per-clinic revenue
   - Payment success rates
   - Outstanding balance

2. **Queries for Analytics**
   ```sql
   -- Monthly revenue trend
   SELECT 
     DATE_TRUNC('month', issued_at) as month,
     SUM(total_amount) as revenue,
     COUNT(*) as invoice_count,
     AVG(total_amount) as avg_invoice
   FROM monthly_invoices
   WHERE status = 'paid'
   GROUP BY month
   ORDER BY month DESC;
   
   -- Top clinics by revenue
   SELECT 
     c.name,
     SUM(mi.total_amount) as total_revenue,
     COUNT(mi.id) as invoice_count
   FROM monthly_invoices mi
   JOIN clinics c ON c.id = mi.clinic_id
   WHERE mi.status = 'paid'
   GROUP BY c.name
   ORDER BY total_revenue DESC
   LIMIT 10;
   
   -- Payment delays
   SELECT 
     invoice_number,
     clinic_name,
     issued_at,
     due_date,
     paid_at,
     (paid_at - due_date) as days_late
   FROM monthly_invoices
   WHERE status = 'paid'
     AND paid_at > due_date
   ORDER BY days_late DESC;
   ```

---

## 🎯 Summary

**What Was Removed:**
- ❌ Automatic invoice generation on report finalization
- ❌ Monthly invoice aggregation system
- ❌ Complex pricing calculations with add-ons
- ❌ Invoice line items tracking
- ❌ Automated email sending
- ❌ Invoice status management UI
- ❌ Payment tracking system
- ❌ Revenue analytics dashboard

**What Was Kept:**
- ✅ Case tracking
- ✅ Report creation
- ✅ Basic pricing logic (FOV-based)
- ✅ Manual billing export (CSV)
- ✅ Simple invoice reference

**Restoration Effort Estimate:**
- Database: 2-3 hours
- Edge Functions: 2-4 hours
- Frontend Components: 4-6 hours
- Testing & Migration: 2-3 hours
- **Total: 10-16 hours development time**

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-07  
**Maintained By:** System Administrator

For questions about restoring this system, refer to this document and the original migration files in `supabase/migrations/`.

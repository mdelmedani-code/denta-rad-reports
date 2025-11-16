-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  available_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (template_key, template_name, subject, html_content, description, available_variables) VALUES
(
  'invoice_email',
  'Invoice Email',
  'Invoice {{invoice_number}} from DentaRad',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2563eb;">Invoice {{invoice_number}}</h1>
    
    <p>Dear {{clinic_name}},</p>
    
    <p>Thank you for using DentaRad''s CBCT reporting services. Please find your invoice attached to this email.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #1e293b;">Invoice Summary</h2>
      <table style="width: 100%;">
        <tr>
          <td><strong>Invoice Number:</strong></td>
          <td>{{invoice_number}}</td>
        </tr>
        <tr>
          <td><strong>Amount Due:</strong></td>
          <td style="font-size: 18px; color: #2563eb;"><strong>£{{amount}}</strong></td>
        </tr>
        <tr>
          <td><strong>Due Date:</strong></td>
          <td>{{due_date}}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #92400e;">Payment Instructions</h3>
      <p style="margin: 5px 0;">Please make payment within 30 days to avoid late fees.</p>
      <p style="margin: 5px 0;">For bank transfer details or payment queries, please contact us at <a href="mailto:accounts@dentarad.com">accounts@dentarad.com</a></p>
    </div>
    
    <p>If you have any questions about this invoice, please don''t hesitate to contact us.</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
      <p><strong>DentaRad Limited</strong><br>
      Professional CBCT Reporting Services<br>
      Email: info@dentarad.com<br>
      Web: www.dentarad.com</p>
    </div>
  </div>',
  'Email template sent when invoices are generated and emailed to clinics',
  '["invoice_number", "clinic_name", "amount", "due_date"]'::jsonb
),
(
  'reminder_pre_due',
  'Pre-Due Reminder',
  'Reminder: Invoice {{invoice_number}} Due in {{days_until_due}} Days',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2563eb;">Payment Reminder</h1>
    
    <p>Dear {{clinic_name}},</p>
    
    <p>This invoice is due in {{days_until_due}} days.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #f59e0b;">Upcoming Payment</h3>
      <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
      <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 18px; color: #f59e0b;"><strong>£{{amount}}</strong></span></p>
      <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e293b;">Payment Instructions</h3>
      <p style="margin: 5px 0;">Please make payment as soon as possible to avoid any disruption to service.</p>
      <p style="margin: 5px 0;">For bank transfer details or payment queries, please contact us at <a href="mailto:accounts@dentarad.com">accounts@dentarad.com</a></p>
    </div>
    
    <p>If you have already made payment, please disregard this reminder and accept our thanks.</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
      <p><strong>DentaRad Limited</strong><br>
      Professional CBCT Reporting Services<br>
      Email: info@dentarad.com<br>
      Web: www.dentarad.com</p>
    </div>
  </div>',
  'Email template for payment reminders sent before the due date',
  '["invoice_number", "clinic_name", "amount", "due_date", "days_until_due"]'::jsonb
),
(
  'reminder_overdue',
  'Overdue Notice',
  'Overdue Invoice {{invoice_number}} - Payment Required',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2563eb;">Payment Reminder</h1>
    
    <p>Dear {{clinic_name}},</p>
    
    <p>This invoice is now {{days_overdue}} days overdue.</p>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #dc2626;">Payment Overdue</h3>
      <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
      <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 18px; color: #dc2626;"><strong>£{{amount}}</strong></span></p>
      <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e293b;">Payment Instructions</h3>
      <p style="margin: 5px 0;">Please make payment as soon as possible to avoid any disruption to service.</p>
      <p style="margin: 5px 0;">For bank transfer details or payment queries, please contact us at <a href="mailto:accounts@dentarad.com">accounts@dentarad.com</a></p>
    </div>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b;"><strong>Important:</strong> Late payment fees may apply to overdue invoices. Please settle this invoice immediately.</p>
    </div>
    
    <p>If you have already made payment, please disregard this reminder and accept our thanks.</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
      <p><strong>DentaRad Limited</strong><br>
      Professional CBCT Reporting Services<br>
      Email: info@dentarad.com<br>
      Web: www.dentarad.com</p>
    </div>
  </div>',
  'Email template for overdue invoice notifications',
  '["invoice_number", "clinic_name", "amount", "due_date", "days_overdue"]'::jsonb
);
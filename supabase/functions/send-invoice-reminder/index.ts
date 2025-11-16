import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  invoice_id: string;
  clinic_email: string;
  clinic_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  reminder_type: 'pre_due' | 'overdue';
  days_until_due?: number;
  days_overdue?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      invoice_id, 
      clinic_email, 
      clinic_name, 
      invoice_number,
      amount,
      due_date,
      reminder_type,
      days_until_due,
      days_overdue
    }: ReminderRequest = await req.json();

    const isPreDue = reminder_type === 'pre_due';
    const subject = isPreDue 
      ? `Reminder: Invoice ${invoice_number} Due in ${days_until_due} Days`
      : `Overdue Invoice ${invoice_number} - Payment Required`;

    const urgencyColor = isPreDue ? '#f59e0b' : '#dc2626';
    const urgencyBg = isPreDue ? '#fef3c7' : '#fee2e2';
    const urgencyText = isPreDue 
      ? `This invoice is due in ${days_until_due} days.`
      : `This invoice is now ${days_overdue} days overdue.`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "DentaRad <invoices@dentarad.com>",
      to: [clinic_email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Payment Reminder</h1>
          
          <p>Dear ${clinic_name},</p>
          
          <p>${urgencyText}</p>
          
          <div style="background-color: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${urgencyColor};">${isPreDue ? 'Upcoming Payment' : 'Payment Overdue'}</h3>
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice_number}</p>
            <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 18px; color: ${urgencyColor};"><strong>£${amount.toFixed(2)}</strong></span></p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Payment Instructions</h3>
            <p style="margin: 5px 0;">Please make payment as soon as possible to avoid any disruption to service.</p>
            <p style="margin: 5px 0;">For bank transfer details or payment queries, please contact us at <a href="mailto:accounts@dentarad.com">accounts@dentarad.com</a></p>
          </div>
          
          ${!isPreDue ? `
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Important:</strong> Late payment fees may apply to overdue invoices. Please settle this invoice immediately.</p>
          </div>
          ` : ''}
          
          <p>If you have already made payment, please disregard this reminder and accept our thanks.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
            <p><strong>DentaRad Limited</strong><br>
            Professional CBCT Reporting Services<br>
            Email: info@dentarad.com<br>
            Web: www.dentarad.com</p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    // Log the reminder sent
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        recipient_id: invoice_id, // Using invoice_id as reference
        type: reminder_type === 'pre_due' ? 'invoice_reminder' : 'invoice_overdue',
        title: subject,
        message: `Reminder email sent to ${clinic_email}`,
        email_sent: true,
        data: {
          invoice_number,
          amount,
          due_date,
          days_until_due,
          days_overdue
        }
      });

    if (logError) {
      console.error('Failed to log reminder:', logError);
    }

    console.log('Reminder email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending reminder email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

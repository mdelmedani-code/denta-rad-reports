import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  invoice_id: string;
  clinic_email: string;
  clinic_name: string;
  invoice_number: string;
  pdf_storage_path: string;
  amount: number;
  due_date: string;
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
      pdf_storage_path,
      amount,
      due_date
    }: SendInvoiceRequest = await req.json();

    // Get signed URL for PDF (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(pdf_storage_path, 3600);

    if (urlError || !signedUrlData) {
      throw new Error('Failed to generate PDF download link');
    }

    // Download PDF for attachment
    const pdfResponse = await fetch(signedUrlData.signedUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF');
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: "DentaRad <invoices@dentarad.com>",
      to: [clinic_email],
      subject: `Invoice ${invoice_number} from DentaRad`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Invoice ${invoice_number}</h1>
          
          <p>Dear ${clinic_name},</p>
          
          <p>Thank you for using DentaRad's CBCT reporting services. Please find your invoice attached to this email.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1e293b;">Invoice Summary</h2>
            <table style="width: 100%;">
              <tr>
                <td><strong>Invoice Number:</strong></td>
                <td>${invoice_number}</td>
              </tr>
              <tr>
                <td><strong>Amount Due:</strong></td>
                <td style="font-size: 18px; color: #2563eb;"><strong>£${amount.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td><strong>Due Date:</strong></td>
                <td>${new Date(due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #92400e;">Payment Instructions</h3>
            <p style="margin: 5px 0;">Please make payment within 30 days to avoid late fees.</p>
            <p style="margin: 5px 0;">For bank transfer details or payment queries, please contact us at <a href="mailto:accounts@dentarad.com">accounts@dentarad.com</a></p>
          </div>
          
          <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
            <p><strong>DentaRad Limited</strong><br>
            Professional CBCT Reporting Services<br>
            Email: info@dentarad.com<br>
            Web: www.dentarad.com</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoice_number}.pdf`,
          content: Buffer.from(pdfBuffer),
        },
      ],
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    // Update invoice status to 'sent'
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('Failed to update invoice status:', updateError);
    }

    console.log('Invoice email sent successfully:', emailResponse);

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
    console.error("Error sending invoice email:", error);
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

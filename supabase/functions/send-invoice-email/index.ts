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

    // Fetch email template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', 'invoice_email')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Failed to fetch email template:', templateError);
      throw new Error('Email template not found');
    }

    // Replace template variables
    const variables: Record<string, string> = {
      invoice_number,
      clinic_name,
      amount: amount.toFixed(2),
      due_date: new Date(due_date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    };

    let emailSubject = template.subject;
    let emailHtml = template.html_content;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      emailSubject = emailSubject.replace(regex, variables[key]);
      emailHtml = emailHtml.replace(regex, variables[key]);
    });

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
      subject: emailSubject,
      html: emailHtml,
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

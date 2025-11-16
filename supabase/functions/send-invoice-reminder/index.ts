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

    // Fetch email template from database based on reminder type
    const templateKey = reminder_type === 'pre_due' ? 'reminder_pre_due' : 'reminder_overdue';
    
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', templateKey)
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
      }),
      days_until_due: days_until_due?.toString() || '',
      days_overdue: days_overdue?.toString() || ''
    };

    let emailSubject = template.subject;
    let emailHtml = template.html_content;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      emailSubject = emailSubject.replace(regex, variables[key]);
      emailHtml = emailHtml.replace(regex, variables[key]);
    });

    // Send email
    const emailResponse = await resend.emails.send({
      from: "DentaRad <invoices@dentarad.com>",
      to: [clinic_email],
      subject: emailSubject,
      html: emailHtml,
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

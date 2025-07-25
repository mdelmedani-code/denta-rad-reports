import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'new_case' | 'status_change' | 'urgent_case' | 'daily_summary';
  recipientId: string;
  data: {
    caseId?: string;
    patientName?: string;
    clinicName?: string;
    oldStatus?: string;
    newStatus?: string;
    urgency?: string;
    clinicalQuestion?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientId, data }: NotificationRequest = await req.json();
    
    console.log(`Processing notification: ${type} for user ${recipientId}`);

    // Get user email and notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, notification_preferences')
      .eq('id', recipientId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user wants this type of notification
    const preferences = profile.notification_preferences || {};
    const prefKey = `email_${type}`;
    
    if (preferences[prefKey] === false) {
      console.log(`User ${recipientId} has disabled ${type} notifications`);
      return new Response(JSON.stringify({ message: 'Notification disabled by user' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate email content based on notification type
    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'new_case':
        subject = `New Case Upload: ${data.patientName}`;
        htmlContent = `
          <h2>New Case Submitted</h2>
          <p><strong>Patient:</strong> ${data.patientName}</p>
          <p><strong>Clinic:</strong> ${data.clinicName}</p>
          <p><strong>Clinical Question:</strong> ${data.clinicalQuestion}</p>
          <p><strong>Urgency:</strong> ${data.urgency}</p>
          <p>Please review this case in your admin dashboard.</p>
          <p><a href="${supabaseUrl.replace('/rest/v1', '')}/admin" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
        `;
        break;

      case 'status_change':
        subject = `Case Status Update: ${data.patientName}`;
        htmlContent = `
          <h2>Case Status Updated</h2>
          <p><strong>Patient:</strong> ${data.patientName}</p>
          <p><strong>Status changed from:</strong> ${data.oldStatus} → ${data.newStatus}</p>
          <p>Check your dashboard for the latest updates.</p>
          <p><a href="${supabaseUrl.replace('/rest/v1', '')}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
        `;
        break;

      case 'urgent_case':
        subject = `🚨 URGENT Case: ${data.patientName}`;
        htmlContent = `
          <h2 style="color: #dc2626;">🚨 URGENT CASE ALERT</h2>
          <p><strong>Patient:</strong> ${data.patientName}</p>
          <p><strong>Clinic:</strong> ${data.clinicName}</p>
          <p><strong>Clinical Question:</strong> ${data.clinicalQuestion}</p>
          <p style="color: #dc2626; font-weight: bold;">This case requires immediate attention.</p>
          <p><a href="${supabaseUrl.replace('/rest/v1', '')}/admin" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Immediately</a></p>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "DentaRad <notifications@dentarad.co.uk>",
      to: [profile.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log notification in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        type: type,
        title: subject,
        message: htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for message
        data: data,
        email_sent: true
      });

    if (notificationError) {
      console.error('Error logging notification:', notificationError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
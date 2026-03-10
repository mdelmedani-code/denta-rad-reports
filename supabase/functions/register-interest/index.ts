import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const { firstName, lastName, occupation, email, phone, practice, volume, message } = await req.json();

    const htmlContent = `
      <h2>New Interest Registration</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${firstName} ${lastName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Occupation:</td><td style="padding: 8px;">${occupation || 'Not specified'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${phone || 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Practice:</td><td style="padding: 8px;">${practice}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Expected Volume:</td><td style="padding: 8px;">${volume || 'Not specified'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${message || 'None'}</td></tr>
      </table>
    `;

    const emailResponse = await resend.emails.send({
      from: "DentaRad <notifications@dentarad.co.uk>",
      to: ["admin@dentarad.co.uk"],
      subject: `New Interest Registration: ${firstName} ${lastName} - ${practice}`,
      html: htmlContent,
    });

    console.log("Registration email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending registration email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

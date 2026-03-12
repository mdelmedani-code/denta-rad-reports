import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML-escape to prevent XSS in email
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate and truncate input
function sanitizeInput(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return escapeHtml(value.trim().slice(0, maxLength));
}

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

// Simple phone validation
function isValidPhone(phone: string): boolean {
  return /^[0-9+\s()\-]{5,25}$/.test(phone);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Rate Limiting ---
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check recent submissions from this IP (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("registration_submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .gte("submitted_at", oneHourAgo);

    if (!countError && (count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Input Validation ---
    const body = await req.json();

    const title = sanitizeInput(body.title, 10);
    const firstName = sanitizeInput(body.firstName, 50);
    const lastName = sanitizeInput(body.lastName, 50);
    const occupation = sanitizeInput(body.occupation, 30);
    const practice = sanitizeInput(body.practice, 100);
    const phone = sanitizeInput(body.phone, 25);
    const email = sanitizeInput(body.email, 255);
    const volume = sanitizeInput(body.volume, 20);
    const message = sanitizeInput(body.message, 1000);

    // Required field validation
    if (!firstName || !lastName || !occupation || !email || !phone || !volume) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidEmail(body.email?.trim() || '')) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidPhone(body.phone?.trim() || '')) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Record submission for rate limiting ---
    await supabase.from("registration_submissions").insert({
      ip_address: clientIp,
      email: body.email?.trim().toLowerCase().slice(0, 255),
    });

    // --- Send Email ---
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const htmlContent = `
      <h2>New Interest Registration</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${title} ${firstName} ${lastName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Occupation:</td><td style="padding: 8px;">${occupation || 'Not specified'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Practice:</td><td style="padding: 8px;">${practice || 'Not specified'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${phone}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Expected Volume:</td><td style="padding: 8px;">${volume || 'Not specified'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${message || 'None'}</td></tr>
      </table>
    `;

    const emailResponse = await resend.emails.send({
      from: "DentaRad <notifications@dentarad.co.uk>",
      to: ["admin@dentarad.co.uk"],
      subject: `New Interest Registration: ${firstName} ${lastName} - ${practice || 'No practice'}`,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !webhookSecret) {
      console.error('[stripe-webhook] Missing Stripe credentials');
      return new Response(
        JSON.stringify({ error: 'Stripe credentials not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[stripe-webhook] Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.text();

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('[stripe-webhook] Event:', event.type);

    // Handle invoice payment succeeded
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;

      console.log('[stripe-webhook] Invoice paid:', invoice.id);
      console.log('[stripe-webhook] Customer:', invoice.customer);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Find clinic by Stripe customer ID
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('stripe_customer_id', invoice.customer)
        .single();

      if (clinicError || !clinic) {
        console.error('[stripe-webhook] Clinic not found:', invoice.customer, clinicError);
        return new Response(
          JSON.stringify({ received: true, error: 'Clinic not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[stripe-webhook] Clinic found:', clinic.name);

      // Mark cases as paid
      const { data: updatedCases, error: updateError } = await supabase
        .from('cases')
        .update({
          payment_received: true,
          payment_received_at: new Date().toISOString(),
          stripe_invoice_id: invoice.id
        })
        .eq('clinic_id', clinic.id)
        .eq('billed', true)
        .eq('payment_received', false)
        .select('id, folder_name');

      if (updateError) {
        console.error('[stripe-webhook] Update error:', updateError);
        throw updateError;
      }

      console.log('[stripe-webhook] Marked paid:', updatedCases?.length, 'cases');

      return new Response(
        JSON.stringify({ 
          received: true, 
          clinic: clinic.name,
          cases_updated: updatedCases?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success for all events
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[stripe-webhook] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

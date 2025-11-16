import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    console.log('Processing invoice reminders...', { today: today.toISOString() });

    // First, update overdue invoices
    const { data: overdueInvoices, error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'overdue', status_updated_at: new Date().toISOString() })
      .lt('due_date', today.toISOString().split('T')[0])
      .in('status', ['draft', 'sent'])
      .select('id, invoice_number, clinic_id, amount, due_date');

    if (updateError) {
      console.error('Error updating overdue invoices:', updateError);
    } else {
      console.log(`Updated ${overdueInvoices?.length || 0} overdue invoices`);
    }

    // Find invoices due in 7 days (status: sent or draft)
    const { data: upcomingInvoices, error: upcomingError } = await supabase
      .from('invoices')
      .select('id, invoice_number, clinic_id, amount, due_date, clinics(name, contact_email)')
      .eq('due_date', sevenDaysFromNow.toISOString().split('T')[0])
      .in('status', ['draft', 'sent']);

    if (upcomingError) {
      console.error('Error fetching upcoming invoices:', upcomingError);
    } else {
      console.log(`Found ${upcomingInvoices?.length || 0} invoices due in 7 days`);

      // Send reminders for upcoming invoices
      for (const invoice of upcomingInvoices || []) {
        const clinic = invoice.clinics as any;
        
        try {
          const { error: reminderError } = await supabase.functions.invoke('send-invoice-reminder', {
            body: {
              invoice_id: invoice.id,
              clinic_email: clinic.contact_email,
              clinic_name: clinic.name,
              invoice_number: invoice.invoice_number,
              amount: invoice.amount,
              due_date: invoice.due_date,
              reminder_type: 'pre_due',
              days_until_due: 7
            }
          });

          if (reminderError) {
            console.error(`Failed to send reminder for invoice ${invoice.invoice_number}:`, reminderError);
          } else {
            console.log(`Sent reminder for invoice ${invoice.invoice_number}`);
          }
        } catch (error) {
          console.error(`Error sending reminder for invoice ${invoice.invoice_number}:`, error);
        }
      }
    }

    // Find newly overdue invoices (status changed to overdue today)
    const { data: newlyOverdueInvoices, error: overdueError } = await supabase
      .from('invoices')
      .select('id, invoice_number, clinic_id, amount, due_date, clinics(name, contact_email)')
      .eq('status', 'overdue')
      .gte('status_updated_at', today.toISOString().split('T')[0]);

    if (overdueError) {
      console.error('Error fetching overdue invoices:', overdueError);
    } else {
      console.log(`Found ${newlyOverdueInvoices?.length || 0} newly overdue invoices`);

      // Send overdue reminders
      for (const invoice of newlyOverdueInvoices || []) {
        const clinic = invoice.clinics as any;
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        try {
          const { error: reminderError } = await supabase.functions.invoke('send-invoice-reminder', {
            body: {
              invoice_id: invoice.id,
              clinic_email: clinic.contact_email,
              clinic_name: clinic.name,
              invoice_number: invoice.invoice_number,
              amount: invoice.amount,
              due_date: invoice.due_date,
              reminder_type: 'overdue',
              days_overdue: daysOverdue
            }
          });

          if (reminderError) {
            console.error(`Failed to send overdue notice for invoice ${invoice.invoice_number}:`, reminderError);
          } else {
            console.log(`Sent overdue notice for invoice ${invoice.invoice_number}`);
          }
        } catch (error) {
          console.error(`Error sending overdue notice for invoice ${invoice.invoice_number}:`, error);
        }
      }
    }

    const summary = {
      processed_at: new Date().toISOString(),
      overdue_updated: overdueInvoices?.length || 0,
      reminders_sent: upcomingInvoices?.length || 0,
      overdue_notices_sent: newlyOverdueInvoices?.length || 0
    };

    console.log('Invoice reminder processing complete:', summary);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing invoice reminders:", error);
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

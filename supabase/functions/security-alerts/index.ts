import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AlertData {
  type: string;
  count: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const alerts: AlertData[] = [];

    // Check failed logins in last hour
    const { count: failedLogins } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('successful', false)
      .gte('attempt_time', oneHourAgo);

    // Check unauthorized access attempts
    const { count: unauthorizedAccess } = await supabase
      .from('security_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'unauthorized_access_attempt')
      .gte('created_at', oneHourAgo);

    // Check for locked accounts
    const { count: lockedAccounts } = await supabase
      .from('login_attempts')
      .select('email', { count: 'exact', head: true })
      .eq('successful', false)
      .gte('attempt_time', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(5);

    // Generate alerts based on thresholds
    if (failedLogins && failedLogins > 20) {
      alerts.push({
        type: 'BRUTE_FORCE',
        count: failedLogins,
        message: `${failedLogins} failed login attempts detected in the last hour`,
        severity: 'high'
      });
    }

    if (unauthorizedAccess && unauthorizedAccess > 5) {
      alerts.push({
        type: 'UNAUTHORIZED_ACCESS',
        count: unauthorizedAccess,
        message: `${unauthorizedAccess} unauthorized access attempts in the last hour`,
        severity: 'critical'
      });
    }

    if (lockedAccounts && lockedAccounts >= 3) {
      alerts.push({
        type: 'MULTIPLE_LOCKOUTS',
        count: lockedAccounts,
        message: `${lockedAccounts} accounts locked due to failed login attempts`,
        severity: 'medium'
      });
    }

    // Send alerts if any were generated
    for (const alert of alerts) {
      await sendAlert(alert);
      
      // Log alert to audit log
      await supabase.from('security_audit_log').insert({
        action: 'security_alert_triggered',
        table_name: 'system',
        severity: alert.severity,
        details: {
          alert_type: alert.type,
          count: alert.count,
          message: alert.message
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsGenerated: alerts.length,
        alerts 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Security alert error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendAlert(alert: AlertData) {
  // Log to console (will appear in Supabase logs)
  console.error('🚨 SECURITY ALERT:', JSON.stringify(alert, null, 2));
  
  // TODO: Implement actual email/SMS notifications
  // This could be integrated with:
  // - Resend API for email
  // - Twilio for SMS
  // - Slack webhooks for team notifications
  // - PagerDuty for on-call alerts
  
  // Example with Resend (if RESEND_API_KEY is configured):
  /*
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'security@yourdomain.com',
        to: ['admin@yourdomain.com'],
        subject: `Security Alert: ${alert.type}`,
        html: `
          <h2>Security Alert Detected</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Count:</strong> ${alert.count}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `
      })
    });
  }
  */
}

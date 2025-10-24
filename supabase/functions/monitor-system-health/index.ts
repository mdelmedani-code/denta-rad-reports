import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[monitor-system-health] Starting health check...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log('[monitor-system-health] Admin verified:', user.id);

    // Run health check function
    const { data: healthIssues, error: healthError } = await supabase.rpc('check_system_health');

    if (healthError) {
      throw new Error(`Health check failed: ${healthError.message}`);
    }

    console.log('[monitor-system-health] Health issues found:', healthIssues?.length || 0);

    // Calculate severity score
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    if (healthIssues && healthIssues.length > 0) {
      for (const issue of healthIssues) {
        switch (issue.severity) {
          case 'critical': criticalIssues++; break;
          case 'high': highIssues++; break;
          case 'medium': mediumIssues++; break;
          case 'low': lowIssues++; break;
        }
      }
    }

    const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
    const systemHealthy = totalIssues === 0;

    // Send notification if critical or high severity issues found
    if (criticalIssues > 0 || highIssues > 0) {
      console.log('[monitor-system-health] ⚠️ Critical/High issues detected, sending alert...');
      
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'system_alert',
            title: '🚨 DentaRad System Health Alert',
            message: `System health check detected ${criticalIssues} critical and ${highIssues} high severity issues.`,
            data: {
              critical_issues: criticalIssues,
              high_issues: highIssues,
              medium_issues: mediumIssues,
              low_issues: lowIssues,
              issues: healthIssues
            }
          }
        });
        console.log('[monitor-system-health] ✅ Alert sent');
      } catch (notifyError) {
        console.error('[monitor-system-health] Failed to send alert:', notifyError);
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      system_healthy: systemHealthy,
      summary: {
        total_issues: totalIssues,
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues
      },
      issues: healthIssues || []
    };

    console.log('[monitor-system-health] Health check complete:', 
      systemHealthy ? '✅ System healthy' : `⚠️ ${totalIssues} issues found`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[monitor-system-health] ERROR:', error);
    
    let statusCode = 500;
    if (error.message.includes('Unauthorized') || error.message.includes('Admin access')) {
      statusCode = 403;
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error.message || 'System health check failed'
        }
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

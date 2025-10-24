import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Health check thresholds (named constants for maintainability)
const HEALTH_THRESHOLDS = {
  ORPHANED_HOURS: 24,        // Cases with incomplete uploads
  STALE_HOURS: 1,            // Uploaded but not synced to Dropbox
  UNPROCESSED_HOURS: 48,     // Still in uploaded status
  FAILED_SYNC_DAYS: 7        // Lookback window for sync warnings
} as const;

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

    // ✅ FIX #4 + PERFORMANCE OPTIMIZATION: Single optimized query for all health checks
    console.log('[monitor-system-health] Running health metrics query...');
    const { data: metricsData, error: metricsError } = await supabase
      .rpc('get_health_metrics');

    if (metricsError) {
      console.error('[monitor-system-health] Metrics query failed:', metricsError);
      throw new Error(`Health metrics query failed: ${metricsError.message}`);
    }

    console.log('[monitor-system-health] Metrics retrieved:', metricsData);

    const healthIssues: any[] = [];

    // Check 1: Orphaned uploads
    if (metricsData.orphaned_uploads?.total_count > 0) {
      healthIssues.push({
        type: 'orphaned_uploads',
        severity: 'medium',
        count: metricsData.orphaned_uploads.total_count,
        message: `${metricsData.orphaned_uploads.total_count} cases with incomplete uploads (>${HEALTH_THRESHOLDS.ORPHANED_HOURS} hours)`,
        cases: metricsData.orphaned_uploads.cases || []
      });
    }

    // Check 2: Failed syncs
    if (metricsData.failed_syncs?.total_count > 0) {
      healthIssues.push({
        type: 'failed_syncs',
        severity: 'medium',
        count: metricsData.failed_syncs.total_count,
        message: `${metricsData.failed_syncs.total_count} cases with sync warnings in last ${HEALTH_THRESHOLDS.FAILED_SYNC_DAYS} days`,
        cases: metricsData.failed_syncs.cases || []
      });
    }

    // Check 3: Stale cases
    if (metricsData.stale_cases?.total_count > 0) {
      healthIssues.push({
        type: 'stale_cases',
        severity: 'low',
        count: metricsData.stale_cases.total_count,
        message: `${metricsData.stale_cases.total_count} cases uploaded but not synced (>${HEALTH_THRESHOLDS.STALE_HOURS} hour)`,
        cases: metricsData.stale_cases.cases || []
      });
    }

    // Check 4: Unprocessed uploads
    if (metricsData.unprocessed_uploads?.total_count > 0) {
      healthIssues.push({
        type: 'unprocessed_uploads',
        severity: 'high',
        count: metricsData.unprocessed_uploads.total_count,
        message: `${metricsData.unprocessed_uploads.total_count} cases uploaded >${HEALTH_THRESHOLDS.UNPROCESSED_HOURS} hours ago still not processed`,
        cases: metricsData.unprocessed_uploads.cases || []
      });
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

    // ✅ FIX #4: Only send notification for critical or high severity issues (not medium/low)
    if (criticalIssues > 0 || highIssues > 0) {
      console.log('[monitor-system-health] ⚠️ Critical/High issues detected, sending alert...');
      
      // Filter to only critical/high issues for alert
      const criticalHighIssues = healthIssues.filter(
        i => i.severity === 'critical' || i.severity === 'high'
      );
      
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
              issues: criticalHighIssues
            }
          }
        });
        console.log('[monitor-system-health] ✅ Alert sent');
      } catch (notifyError) {
        console.error('[monitor-system-health] Failed to send alert:', notifyError);
      }
    } else if (totalIssues > 0) {
      console.log('[monitor-system-health] ⚠️ Warning-level issues found (no alert sent)');
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

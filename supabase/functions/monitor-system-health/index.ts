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

    // ✅ FIX #4: Run health checks directly (no RPC calls)
    const healthIssues: any[] = [];

    // Check 1: Orphaned uploads (created but never completed, >24h)
    const { data: orphanedUploads, error: orphanError } = await supabase
      .from('cases')
      .select('id, folder_name, created_at')
      .eq('upload_completed', false)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!orphanError && orphanedUploads && orphanedUploads.length > 0) {
      healthIssues.push({
        type: 'orphaned_uploads',
        severity: 'medium',
        count: orphanedUploads.length,
        message: `${orphanedUploads.length} cases with incomplete uploads (>24 hours)`,
        cases: orphanedUploads.slice(0, 5).map(c => ({ id: c.id, folder: c.folder_name }))
      });
    }

    // Check 2: Failed syncs (cases with sync warnings)
    const { data: failedSyncs, error: syncError } = await supabase
      .from('cases')
      .select('id, folder_name, sync_warnings')
      .not('sync_warnings', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!syncError && failedSyncs && failedSyncs.length > 0) {
      healthIssues.push({
        type: 'failed_syncs',
        severity: 'medium',
        count: failedSyncs.length,
        message: `${failedSyncs.length} cases with sync warnings in last 7 days`,
        cases: failedSyncs.slice(0, 5).map(c => ({ id: c.id, folder: c.folder_name, warning: c.sync_warnings }))
      });
    }

    // Check 3: Stale cases (uploaded but not synced >1h)
    const { data: staleCases, error: staleError } = await supabase
      .from('cases')
      .select('id, folder_name, created_at')
      .eq('synced_to_dropbox', false)
      .eq('status', 'uploaded')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (!staleError && staleCases && staleCases.length > 0) {
      healthIssues.push({
        type: 'stale_cases',
        severity: 'low',
        count: staleCases.length,
        message: `${staleCases.length} cases uploaded but not synced (>1 hour)`,
        cases: staleCases.slice(0, 5).map(c => ({ id: c.id, folder: c.folder_name }))
      });
    }

    // Check 4: Unprocessed uploads (>48h still uploaded status)
    const { data: unprocessedCases, error: unprocessedError } = await supabase
      .from('cases')
      .select('id, folder_name, created_at')
      .eq('status', 'uploaded')
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (!unprocessedError && unprocessedCases && unprocessedCases.length > 0) {
      healthIssues.push({
        type: 'unprocessed_uploads',
        severity: 'high',
        count: unprocessedCases.length,
        message: `${unprocessedCases.length} cases uploaded >48 hours ago still not processed`,
        cases: unprocessedCases.slice(0, 5).map(c => ({ id: c.id, folder: c.folder_name }))
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

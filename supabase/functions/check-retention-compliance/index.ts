import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get active retention policies
    const { data: policies, error: policiesError } = await supabaseClient
      .from('data_retention_policies')
      .select('*')
      .eq('is_active', true);

    if (policiesError) throw policiesError;

    const complianceReport = [];

    for (const policy of policies || []) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - (policy.archive_after_days || policy.retention_days));

      let table = '';
      let dateColumn = '';

      // Map resource types to tables
      switch (policy.resource_type) {
        case 'cbct_scans':
          table = 'cases';
          dateColumn = 'upload_date';
          break;
        case 'reports':
          table = 'reports';
          dateColumn = 'created_at';
          break;
        case 'audit_logs':
          table = 'security_audit_log';
          dateColumn = 'created_at';
          break;
        case 'case_metadata':
          table = 'cases';
          dateColumn = 'created_at';
          break;
        default:
          continue;
      }

      // Count records needing archival
      const { count: needsArchive, error: archiveError } = await supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .lt(dateColumn, archiveDate.toISOString());

      // Count records past retention period (should be deleted/archived)
      const { count: needsDeletion, error: deleteError } = await supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .lt(dateColumn, cutoffDate.toISOString());

      // Count total records
      const { count: totalRecords, error: totalError } = await supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      complianceReport.push({
        resource_type: policy.resource_type,
        compliance_standard: policy.compliance_standard,
        retention_days: policy.retention_days,
        total_records: totalRecords || 0,
        needs_archive: needsArchive || 0,
        needs_deletion: needsDeletion || 0,
        compliance_status: (needsDeletion || 0) === 0 ? 'compliant' : 'action_required',
        cutoff_date: cutoffDate.toISOString(),
      });

      // Log compliance check
      await supabaseClient.functions.invoke('log-audit-event', {
        body: {
          action: 'compliance_check',
          table_name: table,
          event_category: 'compliance',
          severity: (needsDeletion || 0) > 0 ? 'warning' : 'info',
          new_values: {
            policy: policy.resource_type,
            needs_action: needsDeletion || 0,
          },
        },
      });
    }

    // Check for non-compliant items and alert
    const nonCompliant = complianceReport.filter(r => r.compliance_status === 'action_required');
    if (nonCompliant.length > 0) {
      console.warn('NON-COMPLIANT ITEMS FOUND:', nonCompliant);

      // Notify admins
      const { data: admins } = await supabaseClient
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabaseClient
            .from('notifications')
            .insert({
              recipient_id: admin.id,
              type: 'compliance_alert',
              title: 'Data Retention Compliance Alert',
              message: `${nonCompliant.length} resource type(s) require retention action`,
              data: { non_compliant: nonCompliant },
            });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        compliance_report: complianceReport,
        summary: {
          total_policies: policies?.length || 0,
          compliant: complianceReport.filter(r => r.compliance_status === 'compliant').length,
          action_required: nonCompliant.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Compliance check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

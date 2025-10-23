import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Mark case completed request received');

    // 1. Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // 2. Check user role (must be reporter or admin)
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      throw new Error('User role not found');
    }

    const roles = userRoles.map(r => r.role);
    const isReporterOrAdmin = roles.includes('admin') || roles.includes('reporter');

    if (!isReporterOrAdmin) {
      throw new Error('Only reporters or admins can mark cases as completed');
    }

    console.log('User has reporter/admin role');

    // 3. Get case ID
    const { caseId } = await req.json();
    if (!caseId) {
      throw new Error('Missing caseId');
    }

    console.log('Processing case:', caseId);

    // 4. Get case details
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case not found:', caseError);
      throw new Error('Case not found');
    }

    console.log('Case found:', caseData.patient_id);

    // 5. Use folder_name from database
    const folderName = caseData.folder_name;
    if (!folderName) {
      throw new Error('Folder name not found in database');
    }

    // Construct expected Dropbox report path
    const dropboxReportPath = `/DentaRad/Reports/${folderName}/report.pdf`;

    console.log('Expected report path:', dropboxReportPath);

    // 6. Initialize Dropbox client
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    // 7. Verify report PDF exists in Dropbox
    try {
      console.log('Verifying report PDF exists...');
      await dbx.filesGetMetadata({ path: dropboxReportPath });
      console.log('Report PDF verified');
    } catch (error) {
      console.error('Report PDF not found in Dropbox:', error);
      throw new Error(
        `Report PDF not found at: ${dropboxReportPath}\n\n` +
        `Please save your report PDF to this EXACT location:\n` +
        `/DentaRad/Reports/${folderName}/report.pdf\n\n` +
        `Make sure:\n` +
        `1. File is in the correct folder: ${folderName}/\n` +
        `2. Filename is exactly: report.pdf (lowercase)\n` +
        `3. File has finished uploading to Dropbox (check sync status)`
      );
    }

    // 8. Update case status
    const { error: updateError } = await supabaseClient
      .from('cases')
      .update({
        status: 'report_ready',
        dropbox_report_path: dropboxReportPath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('Failed to update case:', updateError);
      throw new Error(`Failed to update case: ${updateError.message}`);
    }

    console.log('Case status updated to report_ready');

    // 9. Create report entry
    const { error: reportError } = await supabaseClient
      .from('reports')
      .insert({
        case_id: caseId,
        author_id: user.id,
        dropbox_path: dropboxReportPath,
        finalized_at: new Date().toISOString(),
      });

    if (reportError) {
      console.warn('Failed to create report entry:', reportError);
      // Don't throw - case is still marked as completed
    }

    // 10. Log audit event
    await supabaseClient.rpc('log_audit_event_secure', {
      p_action: 'case_marked_completed',
      p_resource_type: 'case',
      p_resource_id: caseId,
      p_details: {
        folder_name: folderName,
        dropbox_report_path: dropboxReportPath,
        completed_by: user.id,
      },
    });

    console.log('Case marked as completed successfully');

    // 11. Get clinic user email to send notification
    const { data: clinicData, error: clinicError } = await supabaseClient
      .from('clinics')
      .select('id')
      .eq('id', caseData.clinic_id)
      .single();

    if (!clinicError && clinicData) {
      // Get clinic user profile
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('id, email')
        .eq('clinic_id', clinicData.id)
        .single();

      if (profileData) {
        console.log('Sending notification to clinic user:', profileData.email);
        
        // Send notification via edge function
        try {
          await supabaseClient.functions.invoke('send-notification', {
            body: {
              type: 'report_ready',
              recipientId: profileData.id,
              data: {
                caseId: caseId,
                patientName: caseData.patient_name,
                patientId: caseData.patient_id,
                clinicalQuestion: caseData.clinical_question,
              },
            },
          });
          console.log('Email notification sent successfully');
        } catch (notifError) {
          console.warn('Failed to send email notification:', notifError);
          // Don't fail the request if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case marked as completed',
        folder_name: folderName,
        dropbox_report_path: dropboxReportPath,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in mark-case-completed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

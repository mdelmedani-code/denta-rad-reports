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
    console.log('[complete-case-report] Starting...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Verify user is admin/reporter
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'reporter')) {
      throw new Error('Forbidden - must be admin or reporter');
    }

    console.log('[complete-case-report] User authorized:', user.id);

    const { caseId } = await req.json();
    if (!caseId) throw new Error('Case ID is required');

    console.log('[complete-case-report] Case ID:', caseId);

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        id, folder_name, dropbox_report_path,
        patient_first_name, patient_last_name, patient_id,
        clinical_question, created_at,
        clinics(name, email)
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) throw new Error(`Case not found: ${caseError?.message}`);

    console.log('[complete-case-report] Case found:', caseData.folder_name);

    // Update case status
    console.log('[complete-case-report] Updating case status...');
    const { error: updateError } = await supabase
      .from('cases')
      .update({ status: 'report_ready', updated_at: new Date().toISOString() })
      .eq('id', caseId);

    if (updateError) throw new Error(`Failed to update case status: ${updateError.message}`);
    console.log('[complete-case-report] ✅ Case status updated to report_ready');

    // Create or update report record
    console.log('[complete-case-report] Creating/updating report record...');
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('case_id', caseId)
      .single();

    let reportId: string;

    if (existingReport) {
      await supabase
        .from('reports')
        .update({
          completed_at: new Date().toISOString(),
          is_latest: true
        })
        .eq('id', existingReport.id);
      reportId = existingReport.id;
      console.log('[complete-case-report] ✅ Report record updated');
    } else {
      const { data: newReport, error: reportCreateError } = await supabase
        .from('reports')
        .insert({
          case_id: caseId,
          completed_at: new Date().toISOString(),
          is_latest: true,
          dropbox_path: caseData.dropbox_report_path,
          version: 1
        })
        .select('id')
        .single();

      if (reportCreateError) throw reportCreateError;
      reportId = newReport.id;
      console.log('[complete-case-report] ✅ Report record created');
    }

    // Send notification email
    console.log('[complete-case-report] Sending notification email...');
    try {
      const siteUrl = Deno.env.get('SITE_URL') || 'https://dentarad.com';
      
      await supabase.functions.invoke('send-notification', {
        body: {
          to: caseData.clinics?.email,
          subject: `Report Ready: ${caseData.patient_first_name} ${caseData.patient_last_name}`,
          html: `
<h2>Report Ready</h2>
<p>The CBCT report for <strong>${caseData.patient_first_name} ${caseData.patient_last_name}</strong> is ready.</p>
<p><a href="${siteUrl}/viewer/${caseId}" style="padding: 12px 24px; background: #0066cc; color: white; text-decoration: none;">View & Download Report</a></p>
<h3>Case Details:</h3>
<ul>
  <li><strong>Patient:</strong> ${caseData.patient_first_name} ${caseData.patient_last_name}</li>
  <li><strong>Patient ID:</strong> ${caseData.patient_id}</li>
  <li><strong>Clinical Question:</strong> ${caseData.clinical_question}</li>
</ul>
          `
        }
      });
      console.log('[complete-case-report] ✅ Notification sent to:', caseData.clinics?.email);
    } catch (notifError) {
      console.error('[complete-case-report] ⚠️ Notification error:', notifError);
    }

    console.log('[complete-case-report] SUCCESS');

    return new Response(
      JSON.stringify({
        success: true,
        caseId: caseId,
        status: 'report_ready',
        reportId: reportId,
        message: 'Case marked as completed and clinic notified'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[complete-case-report] ERROR:', error);
    
    let statusCode = 500;
    let errorCode = 'COMPLETE_REPORT_FAILED';
    
    if (error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
    } else if (error.message.includes('Forbidden')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'CASE_NOT_FOUND';
    }

    return new Response(
      JSON.stringify({ error: { code: errorCode, message: error.message } }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

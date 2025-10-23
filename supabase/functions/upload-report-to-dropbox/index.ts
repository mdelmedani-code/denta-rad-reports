import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { caseId, patientId, pdfData, fileName } = await req.json();

    if (!caseId || !patientId || !pdfData || !fileName) {
      throw new Error('Missing required fields: caseId, patientId, pdfData, fileName');
    }

    // Initialize Dropbox with refresh token
    const dbx = new Dropbox({
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
    });

    // Get patient name from the request
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('patient_name, upload_date')
      .eq('id', caseId)
      .single();
    
    if (caseError || !caseData) {
      throw new Error('Failed to fetch case data');
    }

    // Get existing report count for versioning
    const { data: existingReports, error: reportsError } = await supabaseClient
      .from('reports')
      .select('version')
      .eq('case_id', caseId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingReports && existingReports.length > 0 
      ? (existingReports[0].version || 0) + 1 
      : 1;

    // Create versioned filename with timestamp
    const uploadDate = new Date(caseData.upload_date);
    const dateStr = uploadDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const versionedFilename = nextVersion === 1 
      ? `${dateStr}_report.pdf` 
      : `${dateStr}_report_v${nextVersion}_${timestamp}.pdf`;

    const reportPath = `/DentaRad/Reports/${caseData.patient_name}`;
    const fullPath = `${reportPath}/${versionedFilename}`;

    console.log(`Uploading report to: ${fullPath}`);

    // Decode base64 PDF data
    const pdfBuffer = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0));

    // Upload PDF to Dropbox
    await dbx.filesUpload({
      path: fullPath,
      contents: pdfBuffer,
      mode: { '.tag': 'overwrite' },
    });

    console.log('Report PDF uploaded successfully');

    // Update case with report path in database
    const { error: updateError } = await supabaseClient
      .from('cases')
      .update({
        report_path: fullPath,
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('Error updating case with report path:', updateError);
      throw updateError;
    }

    // Update or create report record with version info
    const { error: reportError } = await supabaseClient
      .from('reports')
      .insert({
        case_id: caseId,
        author_id: user.id,
        dropbox_path: fullPath,
        version: nextVersion,
        is_latest: true,
        finalized_at: new Date().toISOString(),
      });

    if (reportError) {
      console.error('Error creating report record:', reportError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reportPath: fullPath,
        message: 'Report uploaded successfully to Dropbox',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Report upload error:', error);
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

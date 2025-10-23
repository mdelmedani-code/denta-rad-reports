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
      .select('patient_name')
      .eq('id', caseId)
      .single();
    
    if (caseError || !caseData) {
      throw new Error('Failed to fetch case data');
    }

    const reportPath = `/DentaRad/Reports/${caseData.patient_name}`;
    const fullPath = `${reportPath}/report.pdf`;

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

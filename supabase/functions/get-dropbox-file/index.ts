import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Dropbox } from 'https://esm.sh/dropbox@10.34.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Get Dropbox file request received');

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

    // 2. Get request parameters
    const { caseId, fileType } = await req.json();
    // fileType: 'scan' or 'report'

    if (!caseId || !fileType) {
      throw new Error('Missing caseId or fileType');
    }

    console.log('Fetching file:', { caseId, fileType });

    // 3. Get case from database (RLS will check access)
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case not found:', caseError);
      throw new Error('Case not found or unauthorized');
    }

    console.log('Case found:', caseData.patient_id);

    // 4. Get Dropbox path
    const dropboxPath = fileType === 'scan' 
      ? caseData.dropbox_scan_path 
      : caseData.dropbox_report_path;

    if (!dropboxPath) {
      throw new Error(`${fileType === 'scan' ? 'DICOM scan' : 'Report'} not available yet`);
    }

    console.log('Dropbox path:', dropboxPath);

    // 5. Initialize Dropbox client
    const dbx = new Dropbox({
      clientId: Deno.env.get('DROPBOX_APP_KEY'),
      clientSecret: Deno.env.get('DROPBOX_APP_SECRET'),
      refreshToken: Deno.env.get('DROPBOX_REFRESH_TOKEN'),
    });

    // 6. Download file from Dropbox
    console.log('Downloading from Dropbox...');
    const response = await dbx.filesDownload({ path: dropboxPath });
    const fileBlob = (response.result as any).fileBlob;

    // 7. Get filename from path
    const fileName = dropboxPath.split('/').pop() || 'download';

    // 8. Convert to ArrayBuffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    
    console.log('File downloaded successfully, size:', arrayBuffer.byteLength);

    // 9. Return file to browser
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': fileType === 'scan' ? 'application/zip' : 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(arrayBuffer.byteLength),
      },
    });

  } catch (error) {
    console.error('Error in get-dropbox-file:', error);
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
